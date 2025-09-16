"use client";

import React from 'react';
import { useSessionManager } from '@/lib/auth/hooks/use-session-manager';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * Session Status Component Props
 */
interface SessionStatusProps {
  showDetails?: boolean;
  className?: string;
}

/**
 * Session Status Component
 * 
 * Displays the current session status and provides manual refresh capability.
 * This component helps users understand their authentication state and 
 * take action if needed.
 */
export function SessionStatus({ 
  showDetails = false, 
  className = "" 
}: SessionStatusProps) {
  const {
    manualRefresh,
    getSessionStatus,
    isSessionNearExpiry,
    timeUntilExpiry
  } = useSessionManager();

  const sessionStatus = getSessionStatus();

  const formatTimeRemaining = (ms: number | null): string => {
    if (!ms) return 'Unknown';
    
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const getStatusBadge = () => {
    if (!sessionStatus.isActive) {
      return <Badge variant="destructive">Not Authenticated</Badge>;
    }
    
    if (isSessionNearExpiry) {
      return <Badge variant="destructive">Expiring Soon</Badge>;
    }
    
    return <Badge variant="default">Active</Badge>;
  };

  if (!sessionStatus.isActive) {
    return null; // Don't show component when not authenticated
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {getStatusBadge()}
      
      {showDetails && (
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>
            Expires in: {formatTimeRemaining(timeUntilExpiry)}
          </span>
          
          {sessionStatus.lastRefresh && (
            <span className="text-xs">
              (Last refresh: {sessionStatus.lastRefresh.toLocaleTimeString()})
            </span>
          )}
        </div>
      )}
      
      <Button
        variant="outline"
        size="sm"
        onClick={manualRefresh}
        className="text-xs"
      >
        Refresh
      </Button>
    </div>
  );
}

/**
 * Minimal Session Indicator
 * 
 * A compact indicator that can be placed in navigation bars or headers
 */
export function SessionIndicator({ className = "" }: { className?: string }) {
  const { isSessionNearExpiry, timeUntilExpiry } = useSessionManager();

  if (!timeUntilExpiry) return null;

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div 
        className={`w-2 h-2 rounded-full ${
          isSessionNearExpiry ? 'bg-red-400 animate-pulse' : 'bg-green-400'
        }`}
        title={`Session expires in ${Math.floor(timeUntilExpiry / (1000 * 60))} minutes`}
      />
      {isSessionNearExpiry && (
        <span className="text-xs text-red-600 font-medium">
          Session expiring
        </span>
      )}
    </div>
  );
}