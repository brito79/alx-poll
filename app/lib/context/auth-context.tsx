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
}

/**
 * Defines the actions that can be dispatched to update the auth state.
 */
type AuthAction =
  | { type: 'INITIAL_STATE_LOADED'; payload: { session: Session | null; user: User | null } }
  | { type: 'AUTH_STATE_CHANGED'; payload: { session: Session | null; user: User | null } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SIGN_OUT' };

// --- Reducer Function ---

const initialAuthState: AuthState = {
  session: null,
  user: null,
  loading: true,
  error: null,
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
    case 'AUTH_STATE_CHANGED':
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
      return { ...initialAuthState, loading: false };
    default:
      return state;
  }
};

// --- Context Definition ---

/**
 * Auth context interface with security enhancements and helper functions.
 */
interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (requiredRoles: string[]) => boolean;
  isResourceOwner: (resourceUserId: string | null) => boolean;
  getUserDisplayInfo: () => {
    id: string;
    email: string | undefined;
    username: any;
    avatarUrl: any;
  } | null;
}

// Create the auth context with a default undefined value to enforce provider usage.
const AuthContext = createContext<AuthContextType | undefined>(undefined);


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
  const supabase = useMemo(() => createClient(), []);
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  useEffect(() => {
    // Set initial loading state
    dispatch({ type: 'SET_LOADING', payload: true });

    // Fetch initial session and user data
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        dispatch({ 
          type: 'INITIAL_STATE_LOADED', 
          payload: { session, user: session?.user ?? null } 
        });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize authentication.' });
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (process.env.NODE_ENV === 'development') {
        console.info('Security event:', event);
      }
      dispatch({ 
        type: 'AUTH_STATE_CHANGED', 
        payload: { session, user: session?.user ?? null }
      });
    });

    // Cleanup subscription on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = useCallback(async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      dispatch({ type: 'SIGN_OUT' });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Sign out error:', error);
      }
      dispatch({ type: 'SET_ERROR', payload: 'Sign out failed. Please try again.' });
    }
  }, [supabase]);

  const hasRole = useCallback((requiredRoles: string[]): boolean => {
    if (!state.user) return false;
    const userRoles = state.user.app_metadata?.roles || [];
    return requiredRoles.some(role => userRoles.includes(role));
  }, [state.user]);

  const isResourceOwner = useCallback((resourceUserId: string | null): boolean => {
    if (!state.user || !resourceUserId) return false;
    return state.user.id === resourceUserId;
  }, [state.user]);

  const getUserDisplayInfo = useCallback(() => {
    if (!state.user) return null;
    return {
      id: state.user.id,
      email: state.user.email,
      username: state.user.user_metadata?.username || null,
      avatarUrl: state.user.user_metadata?.avatar_url || null,
    };
  }, [state.user]);

  // Memoize the context value to prevent unnecessary re-renders of consumers
  const contextValue = useMemo(() => ({
    ...state,
    isAuthenticated: !!state.user,
    signOut,
    hasRole,
    isResourceOwner,
    getUserDisplayInfo,
  }), [state, signOut, hasRole, isResourceOwner, getUserDisplayInfo]);

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
