"use client";

import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from './use-auth';
import { useToast } from '@/components/ui/toast';

/**
 * Session Management Configuration
 */
interface SessionConfig {
  refreshInterval?: number; // Minutes between refresh attempts
  warningTime?: number; // Minutes before expiry to show warning
  maxRetries?: number; // Max retry attempts for failed refresh
}

/**
 * Enhanced Session Management Hook
 * 
 * This hook provides automatic session refresh with user notifications,
 * graceful handling of session expiration, and retry logic for failed
 * refresh attempts. It follows the authentication architecture guidelines
 * for maintaining secure sessions.
 */
export function useSessionManager(config: SessionConfig = {}) {
  const {
    refreshInterval = 10, // 10 minutes
    warningTime = 5, // 5 minutes before expiry
    maxRetries = 3
  } = config;

  const { session, refreshSession, signOut, loading } = useAuth();
  const { toast } = useToast();
  
  // Use refs to avoid stale closure issues
  const retryCountRef = useRef(0);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<Date | null>(null);

  /**
   * Calculate time until session expires
   */
  const getTimeUntilExpiry = useCallback((): number | null => {
    if (!session?.expires_at) return null;
    
    const expiryTime = new Date(session.expires_at).getTime();
    const currentTime = Date.now();
    return Math.max(0, expiryTime - currentTime);
  }, [session?.expires_at]);

  /**
   * Check if session is close to expiring
   */
  const isSessionNearExpiry = useCallback((): boolean => {
    const timeUntilExpiry = getTimeUntilExpiry();
    if (!timeUntilExpiry) return false;
    
    return timeUntilExpiry <= (warningTime * 60 * 1000);
  }, [getTimeUntilExpiry, warningTime]);

  /**
   * Show session expiry warning to user
   */
  const showExpiryWarning = useCallback(() => {
    toast({
      title: "Session Expiring Soon",
      description: "Your session will expire in a few minutes. Your work will be saved automatically.",
      variant: "default",
      duration: 10000, // Show for 10 seconds
    });
  }, [toast]);

  /**
   * Handle session expiry
   */
  const handleSessionExpiry = useCallback(async () => {
    toast({
      title: "Session Expired",
      description: "Your session has expired. Please sign in again to continue.",
      variant: "destructive",
    });
    
    // Sign out the user
    try {
      await signOut();
    } catch (error) {
      console.error('Error during automatic sign out:', error);
    }
  }, [toast, signOut]);

  /**
   * Attempt to refresh the session
   */
  const attemptRefresh = useCallback(async (): Promise<boolean> => {
    try {
      await refreshSession();
      retryCountRef.current = 0; // Reset retry count on success
      lastRefreshRef.current = new Date();
      return true;
    } catch (error) {
      console.error('Session refresh failed:', error);
      retryCountRef.current += 1;
      
      if (retryCountRef.current >= maxRetries) {
        toast({
          title: "Connection Issues",
          description: "Unable to refresh your session. You may need to sign in again.",
          variant: "destructive",
        });
        return false;
      }
      
      // Try again with exponential backoff
      const backoffDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
      setTimeout(() => attemptRefresh(), backoffDelay);
      return false;
    }
  }, [refreshSession, maxRetries, toast]);

  /**
   * Set up automatic session refresh
   */
  const scheduleRefresh = useCallback(() => {
    // Clear existing timeouts
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    if (!session) return;

    const timeUntilExpiry = getTimeUntilExpiry();
    if (!timeUntilExpiry) return;

    // Schedule refresh at interval or before expiry, whichever is sooner
    const refreshTime = Math.min(
      refreshInterval * 60 * 1000,
      timeUntilExpiry - (warningTime * 60 * 1000)
    );

    if (refreshTime > 0) {
      refreshTimeoutRef.current = setTimeout(() => {
        attemptRefresh();
      }, refreshTime);
    }

    // Schedule warning if session will expire
    const warningTime_ms = warningTime * 60 * 1000;
    if (timeUntilExpiry > warningTime_ms) {
      warningTimeoutRef.current = setTimeout(() => {
        showExpiryWarning();
      }, timeUntilExpiry - warningTime_ms);
    }

    // Schedule automatic sign out if session expires
    if (timeUntilExpiry > 0) {
      setTimeout(() => {
        const currentTimeUntilExpiry = getTimeUntilExpiry();
        if (currentTimeUntilExpiry && currentTimeUntilExpiry <= 1000) {
          handleSessionExpiry();
        }
      }, timeUntilExpiry);
    }
  }, [
    session,
    refreshInterval,
    warningTime,
    getTimeUntilExpiry,
    attemptRefresh,
    showExpiryWarning,
    handleSessionExpiry
  ]);

  /**
   * Manual refresh trigger
   */
  const manualRefresh = useCallback(async (): Promise<boolean> => {
    if (loading) return false;
    
    const success = await attemptRefresh();
    if (success) {
      toast({
        title: "Session Refreshed",
        description: "Your session has been refreshed successfully.",
        variant: "default",
      });
    }
    return success;
  }, [loading, attemptRefresh, toast]);

  /**
   * Get session status information
   */
  const getSessionStatus = useCallback(() => {
    const timeUntilExpiry = getTimeUntilExpiry();
    
    return {
      isActive: !!session,
      timeUntilExpiry,
      isNearExpiry: isSessionNearExpiry(),
      lastRefresh: lastRefreshRef.current,
      retryCount: retryCountRef.current
    };
  }, [session, getTimeUntilExpiry, isSessionNearExpiry]);

  // Set up session management when session changes
  useEffect(() => {
    if (session && !loading) {
      scheduleRefresh();
    }

    // Cleanup on unmount or session change
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [session, loading, scheduleRefresh]);

  // Handle page visibility change (refresh when page becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && session) {
        // If the page has been hidden for more than refresh interval, refresh immediately
        const now = new Date();
        const lastRefresh = lastRefreshRef.current;
        
        if (!lastRefresh || (now.getTime() - lastRefresh.getTime()) > (refreshInterval * 60 * 1000)) {
          attemptRefresh();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session, refreshInterval, attemptRefresh]);

  return {
    manualRefresh,
    getSessionStatus,
    isSessionNearExpiry: isSessionNearExpiry(),
    timeUntilExpiry: getTimeUntilExpiry()
  };
}