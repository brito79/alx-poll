'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

/**
 * Auth state interface to ensure atomic state updates
 */
interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
}

/**
 * Auth context interface with security enhancements
 */
interface AuthContextType {
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

// Initial auth state
const initialAuthState: AuthState = {
  session: null,
  user: null,
  loading: true,
  error: null
};

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  signOut: async () => {},
  loading: true,
  error: null,
  isAuthenticated: false
});

/**
 * Auth Provider component that manages authentication state
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Create Supabase client once
  const supabase = useMemo(() => createClient(), []);
  
  // Use a single state object to prevent race conditions
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);

  // Effect to handle auth state and session management
  useEffect(() => {
    let mounted = true;

    // Load initial user data
    const getUser = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const { data: userData, error } = await supabase.auth.getUser();

        if (error) {
          // Only log error type, not full details in dev only
          if (process.env.NODE_ENV === 'development') {
            console.error('Auth error type:', error.name);
          }
          
          // Handle error gracefully
          if (mounted) {
            setAuthState({
              user: null,
              session: null,
              error: 'Unable to authenticate',
              loading: false
            });
          }
          return;
        }
        
        if (mounted) {
          // Set both session and user simultaneously
          setAuthState({
            user: userData.user,
            session: sessionData.session,
            error: null,
            loading: false
          });
        }
      } catch (err) {
        if (mounted) {
          setAuthState({
            user: null,
            session: null,
            error: 'Authentication system unavailable',
            loading: false
          });
        }
      }
    };

    // Initialize auth state
    getUser();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        // Update state based on auth events
        setAuthState(prev => ({
          ...prev,
          user: session?.user ?? null,
          session: session,
          // Keep existing error for most events, but clear it on sign-in
          error: event === 'SIGNED_IN' ? null : prev.error,
          loading: false
        }));
        
        // Additional security logging could be added here for suspicious events
        if (process.env.NODE_ENV === 'development') {
          if (event === 'PASSWORD_RECOVERY' || event === 'TOKEN_REFRESHED') {
            console.info('Security event:', event);
          }
        }
      }
    });

    // Session expiration and refresh management
    const sessionTimeoutCheck = setInterval(() => {
      const { session } = authState;
      
      if (session && session.expires_at) {
        const expiresAt = new Date(session.expires_at * 1000);
        const now = new Date();
        const timeRemaining = expiresAt.getTime() - now.getTime();
        
        // If session expires in less than 5 minutes, refresh it
        if (timeRemaining < 5 * 60 * 1000 && timeRemaining > 0) {
          supabase.auth.refreshSession();
        }
        
        // If session is already expired, update state
        if (timeRemaining <= 0) {
          setAuthState(prev => ({
            ...prev,
            error: 'Your session has expired. Please sign in again.',
            session: null,
            user: null
          }));
        }
      }
    }, 30000); // Check every 30 seconds

    // Clean up subscriptions and intervals
    return () => {
      mounted = false;
      clearInterval(sessionTimeoutCheck);
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  /**
   * Secure sign out function with error handling
   */
  const signOut = async (): Promise<void> => {
    try {
      // Show loading state while signing out
      setAuthState(prev => ({ ...prev, loading: true }));
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Sign out error:', error.name);
        }
        
        // Update state with error
        setAuthState(prev => ({
          ...prev,
          error: 'Error signing out. Please try again.',
          loading: false
        }));
      }
      // Auth state listener will handle the rest
    } catch (err) {
      setAuthState(prev => ({
        ...prev,
        error: 'Sign out failed. Please try again.',
        loading: false
      }));
    }
  };

  // Derived authentication state
  const isAuthenticated = !!authState.user;

  // Create value object with all required properties
  const contextValue: AuthContextType = {
    session: authState.session,
    user: authState.user,
    signOut,
    loading: authState.loading,
    error: authState.error,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Enhanced authentication hook with security features
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  // Return context with additional security helper functions
  return {
    ...context,
    
    /**
     * Check if the current user has the required role(s)
     */
    hasRole: (requiredRoles: string[]): boolean => {
      if (!context.user || !context.isAuthenticated) return false;
      
      // Get user roles from metadata
      const userRoles = context.user.app_metadata?.roles || [];
      return requiredRoles.some(role => userRoles.includes(role));
    },
    
    /**
     * Check if the current user owns a resource
     */
    isResourceOwner: (resourceUserId: string | null): boolean => {
      if (!context.user || !context.isAuthenticated || !resourceUserId) return false;
      return context.user.id === resourceUserId;
    },
    
    /**
     * Get safe user display data (non-sensitive)
     */
    getUserDisplayInfo: () => {
      if (!context.user) return null;
      
      return {
        id: context.user.id,
        email: context.user.email,
        username: context.user.user_metadata?.username || null,
        avatarUrl: context.user.user_metadata?.avatar_url || null
      };
    }
  };
};
