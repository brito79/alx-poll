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
 * Authentication Provider Component
 * 
 * Establishes the global authentication context for the entire application.
 * This component is foundational to the app's security architecture as it:
 * 1. Manages the authentication state across all components
 * 2. Provides real-time session tracking and token refresh capabilities
 * 3. Handles authentication events (sign-in, sign-out, session expiration)
 * 4. Establishes security boundaries for protected resources and routes
 * 
 * Used in: The root layout of the application, wrapping all other components.
 * Every authenticated interaction and protected route depends on this provider
 * to determine access permissions and user identity.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render within this provider
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Create Supabase client once for efficiency and consistent authentication state
  const supabase = useMemo(() => createClient(), []);
  
  // Use a single atomic state object to prevent race conditions during auth state updates
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
   * Secure Sign Out Function
   * 
   * Terminates the user's active session with comprehensive error handling.
   * This function is critical to the authentication lifecycle as it:
   * 1. Provides a controlled mechanism to end user sessions
   * 2. Ensures proper cleanup of authentication state
   * 3. Handles potential failures gracefully to prevent stuck states
   * 4. Updates the auth context to reflect the unauthenticated state
   * 
   * Used in: The application header's logout button, session timeout handlers,
   * and security-sensitive areas where manual session termination is needed.
   * This is the primary way users explicitly end their authenticated sessions.
   * 
   * @returns {Promise<void>} Promise that resolves when sign out is complete
   */
  const signOut = async (): Promise<void> => {
    try {
      // Show loading state while signing out for user feedback
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
 * Enhanced Authentication Hook
 * 
 * Provides access to authentication state and security utilities throughout the app.
 * This hook is central to the application's security implementation as it:
 * 1. Creates a consistent interface for accessing authentication state
 * 2. Provides role-based access control capabilities
 * 3. Offers resource ownership validation for authorization
 * 4. Abstracts sensitive user data into safe display formats
 * 
 * Used in: Throughout the application in any component that needs to:
 * - Check if a user is authenticated
 * - Access the current user's information
 * - Verify permissions for protected operations
 * - Implement conditional rendering based on authentication state
 * - Handle login/logout flows
 * 
 * @returns {AuthContextType & SecurityHelpers} Authentication state and security helper functions
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
     * Role-Based Access Control Function
     * 
     * Verifies if the current user has any of the specified roles.
     * This function is essential to the application's authorization model as it:
     * 1. Enables fine-grained access control throughout the application
     * 2. Creates a reusable pattern for role-based authorization checks
     * 3. Centralizes role verification to ensure consistent security enforcement
     * 4. Gracefully handles unauthenticated states without errors
     * 
     * Used in: Protected routes, admin panels, conditional UI rendering,
     * and anywhere the application needs to restrict features based on user roles.
     * This is a primary authorization mechanism for role-gated functionality.
     * 
     * @param {string[]} requiredRoles - Array of role names to check against
     * @returns {boolean} True if user has any of the required roles
     */
    hasRole: (requiredRoles: string[]): boolean => {
      if (!context.user || !context.isAuthenticated) return false;
      
      // Get user roles from metadata
      const userRoles = context.user.app_metadata?.roles || [];
      return requiredRoles.some(role => userRoles.includes(role));
    },
    
    /**
     * Resource Ownership Verification Function
     * 
     * Determines if the current user owns a specific resource.
     * This function is crucial to the application's data security model as it:
     * 1. Enforces ownership-based access control for user-specific resources
     * 2. Prevents unauthorized access to other users' content
     * 3. Creates a consistent pattern for ownership verification
     * 4. Simplifies complex authorization checks in components
     * 
     * Used in: Poll management screens, voting interfaces, content editing forms,
     * and anywhere the application needs to verify that a user owns the resource
     * they're attempting to modify, view, or delete.
     * 
     * @param {string|null} resourceUserId - The user ID associated with the resource
     * @returns {boolean} True if the current user owns the resource
     */
    isResourceOwner: (resourceUserId: string | null): boolean => {
      if (!context.user || !context.isAuthenticated || !resourceUserId) return false;
      return context.user.id === resourceUserId;
    },
    
    /**
     * Safe User Information Accessor
     * 
     * Provides a sanitized subset of user data for display purposes.
     * This function enhances application security and privacy by:
     * 1. Creating a boundary between sensitive user data and display contexts
     * 2. Ensuring only appropriate user information is exposed in the UI
     * 3. Standardizing the user information format across components
     * 4. Preventing accidental exposure of sensitive authentication details
     * 
     * Used in: Profile displays, headers showing user information, user-specific
     * UI elements, and anywhere the application needs to show user information
     * without exposing sensitive authentication details.
     * 
     * @returns {Object|null} Sanitized user display information or null if not authenticated
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
