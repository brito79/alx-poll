'use client';

import { 
  createContext, 
  useContext, 
  useEffect, 
  useReducer, 
  useMemo,
  useCallback
} from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Session, User } from '@supabase/supabase-js';
import { generateCsrfToken, storeCsrfToken, validateCsrfToken } from '../utils/security';

// --- State and Action Types for Reducer ---

/**
 * Represents the shape of the authentication state.
 * Using a reducer for state management to handle complex state transitions atomically.
 */
interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

/**
 * Defines the actions that can be dispatched to update the auth state.
 */
type AuthAction =
  | { type: 'INITIAL_STATE_LOADED'; payload: { session: Session | null; user: User | null } }
  | { type: 'AUTH_STATE_CHANGED'; payload: { session: Session | null; user: User | null } }
  | { type: 'SESSION_REFRESHED'; payload: { session: Session | null; user: User | null } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SIGN_OUT' };

// --- Reducer Function ---

const initialAuthState: AuthState = {
  session: null,
  user: null,
  loading: true,
  error: null,
  initialized: false,
};

/**
 * Reducer function to manage authentication state transitions.
 * @param state - The current authentication state.
 * @param action - The action to perform.
 * @returns The new authentication state.
 */
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'INITIAL_STATE_LOADED':
      return {
        ...state,
        session: action.payload.session,
        user: action.payload.user,
        error: null,
        loading: false,
        initialized: true,
      };
    case 'AUTH_STATE_CHANGED':
      return {
        ...state,
        session: action.payload.session,
        user: action.payload.user,
        error: null,
        loading: false,
      };
    case 'SESSION_REFRESHED':
      return {
        ...state,
        session: action.payload.session,
        user: action.payload.user,
        error: null,
        loading: false,
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SIGN_OUT':
      return { ...initialAuthState, loading: false, initialized: true };
    default:
      return state;
  }
};

// --- Context Definition ---

/**
 * Auth context interface with security enhancements and helper functions.
 */
interface AuthContextType extends AuthState {
  signIn: (params: { email: string; password: string; rememberMe?: boolean }) => Promise<{ success: boolean; error: string | null }>;
  signUp: (params: { email: string; password: string; userData?: Record<string, any> }) => Promise<{ success: boolean; error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (params: { email: string }) => Promise<{ success: boolean; error: string | null }>;
  refreshSession: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (requiredRoles: string[]) => boolean;
  isResourceOwner: (resourceUserId: string | null) => boolean;
  getUserDisplayInfo: () => {
    id: string;
    email: string | undefined;
    username: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  } | null;
}

// Create the auth context with a default undefined value to enforce provider usage.
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- AuthProvider Component ---

/**
 * Authentication Provider Component
 * 
 * Establishes and manages the global authentication state for the application using
 * a reducer for more predictable state management. It handles session tracking,
 * user data, and provides security-related helper functions.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render within this provider
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const supabase = createClient();
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  // Initialize auth state
  useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    const initializeAuth = async () => {
      try {
        // Fetch initial session and user data
        const { data: { session } } = await supabase.auth.getSession();
        dispatch({ 
          type: 'INITIAL_STATE_LOADED', 
          payload: { session, user: session?.user ?? null } 
        });
      } catch (error) {
        console.error('Failed to initialize authentication:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize authentication' });
      }
    };

    initializeAuth();
  }, [supabase]);

  // Subscribe to auth changes
  useEffect(() => {
    if (!state.initialized) return;

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (process.env.NODE_ENV === 'development') {
        console.info('Auth event:', event);
      }

      dispatch({ 
        type: 'AUTH_STATE_CHANGED', 
        payload: { session, user: session?.user ?? null }
      });
    });

    // Set up session refresh on an interval when authenticated
    let refreshInterval: NodeJS.Timeout | null = null;
    
    if (state.session) {
      // Refresh session every 10 minutes
      refreshInterval = setInterval(() => {
        refreshSession();
      }, 10 * 60 * 1000); // 10 minutes
    }

    // Cleanup subscriptions and intervals on unmount
    return () => {
      authListener.subscription.unsubscribe();
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [supabase, state.initialized, state.session]);

  // Sign out function
  const signOut = useCallback(async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      dispatch({ type: 'SIGN_OUT' });
    } catch (error) {
      if (error instanceof Error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'Sign out failed. Please try again.' });
      }
    }
  }, [supabase]);

  // Session refresh function
  const refreshSession = useCallback(async (): Promise<void> => {
    if (!state.session) return;
    
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        throw error;
      }
      
      dispatch({
        type: 'SESSION_REFRESHED',
        payload: { 
          session: data.session, 
          user: data.session?.user ?? null 
        }
      });
    } catch (error) {
      console.error('Session refresh error:', error);
      // Don't show error to user but log it
    }
  }, [supabase, state.session]);

  // Role checking function
  const hasRole = useCallback((requiredRoles: string[]): boolean => {
    if (!state.user) return false;
    const userRoles = state.user.app_metadata?.roles || [];
    return requiredRoles.some(role => userRoles.includes(role));
  }, [state.user]);

  // Resource ownership check
  const isResourceOwner = useCallback((resourceUserId: string | null): boolean => {
    if (!state.user || !resourceUserId) return false;
    return state.user.id === resourceUserId;
  }, [state.user]);

  // User display info getter
  const getUserDisplayInfo = useCallback(() => {
    if (!state.user) return null;
    
    return {
      id: state.user.id,
      email: state.user.email,
      username: state.user.user_metadata?.username || null,
      fullName: state.user.user_metadata?.full_name || null,
      avatarUrl: state.user.user_metadata?.avatar_url || null,
    };
  }, [state.user]);

  // Client-side auth functions
  const signIn = useCallback(async ({ email, password, rememberMe }: { email: string; password: string; rememberMe?: boolean }): Promise<{ success: boolean; error: string | null }> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Using signInWithPassword directly in the client component
      // For actual production, we'd call a server action with CSRF protection
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      // Set session expiry based on rememberMe
      // In a production app, we would set this on the server side 
      // with HTTP-only cookies
      
      if (error) {
        // We map the error to a user-friendly message on the server action normally
        throw error;
      }
      
      return { success: true, error: null };
    } catch (error) {
      if (error instanceof Error) {
        // Map the error to a user-friendly message
        const friendlyMessage = mapErrorToUserMessage(error.message);
        dispatch({ type: 'SET_ERROR', payload: friendlyMessage });
        return { success: false, error: friendlyMessage };
      }
      return { success: false, error: 'Failed to sign in. Please try again.' };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [supabase]);
  
  // Helper function to map auth errors to user-friendly messages
  const mapErrorToUserMessage = (error: string): string => {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Email or password is incorrect',
      'Email not confirmed': 'Please verify your email address before logging in',
      'Password should be at least 8 characters': 'Password must be at least 8 characters long',
      'User already registered': 'An account with this email already exists',
      'Rate limit exceeded': 'Too many attempts. Please try again later',
      'Token expired': 'Your session has expired. Please log in again',
      'Invalid token': 'Authentication failed. Please log in again',
      'Email link is invalid or has expired': 'The reset link is invalid or has expired'
    };
    
    for (const [key, value] of Object.entries(errorMap)) {
      if (error.includes(key)) {
        return value;
      }
    }
    
    return 'Authentication error. Please try again';
  };

  const signUp = useCallback(async ({ email, password, userData }: { email: string; password: string; userData?: Record<string, any> }): Promise<{ success: boolean; error: string | null }> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData || {},
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        throw error;
      }
      
      return { success: true, error: null };
    } catch (error) {
      if (error instanceof Error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to create account. Please try again.' };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [supabase]);

  const resetPassword = useCallback(async ({ email }: { email: string }): Promise<{ success: boolean; error: string | null }> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      if (error) {
        throw error;
      }
      
      return { success: true, error: null };
    } catch (error) {
      if (error instanceof Error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to send password reset email. Please try again.' };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [supabase]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    ...state,
    isAuthenticated: !!state.user,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshSession,
    hasRole,
    isResourceOwner,
    getUserDisplayInfo,
  }), [state, signIn, signUp, signOut, resetPassword, refreshSession, hasRole, isResourceOwner, getUserDisplayInfo]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// --- useAuth Hook ---

/**
 * Enhanced Authentication Hook
 * 
 * Provides access to the authentication context, including state and security helpers.
 * Throws an error if used outside of an AuthProvider.
 * 
 * @returns {AuthContextType} The authentication context value.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};