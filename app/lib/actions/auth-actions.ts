'use server';

import { createClient } from '@/lib/supabase/server';
import { LoginFormData, RegisterFormData } from '../types';
import { validateLoginForm } from '../utils/validation';
import { isRateLimited, resetRateLimit, logAuthEvent } from '../utils/security';

/**
 * User Authentication Server Action
 * 
 * Authenticates users against the Supabase backend with comprehensive security measures.
 * This function is critical to the application's security model as it:
 * 1. Serves as the primary authentication gateway for all user access
 * 2. Implements rate limiting to prevent brute force attacks
 * 3. Manages secure credential validation without leaking sensitive information
 * 4. Provides proper audit logging for security events
 * 
 * Used in: The login page form submission process. This server action is the bridge
 * between the client-side login form and the backend authentication system.
 * It directly impacts the user's ability to access protected routes and features.
 * 
 * @param {LoginFormData} data - User credentials containing email and password
 * @returns {Promise<{error: string | null}>} Result object with error message if login failed
 */
export async function login(data: LoginFormData) {
  try {
    // Step 1: Validate input data
    const validation = validateLoginForm(data);
    if (!validation.isValid) {
      return { error: validation.message };
    }

    // Step 2: Apply rate limiting
    // Use email as rate limit key - in production consider combining with IP
    const rateLimitKey = `login:${data.email.toLowerCase()}`;
    const { limited, remainingAttempts } = await isRateLimited(rateLimitKey);
    
    if (limited) {
      // Log excessive attempts
      await logAuthEvent('login_rate_limited', false, { 
        email: data.email, 
        details: 'Rate limit exceeded' 
      });
      
      return { error: 'Too many login attempts. Please try again later.' };
    }

    // Step 3: Attempt login with Supabase
    const supabase = await createClient();
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    // Step 4: Handle result and logging
    if (error) {
      // Log failed login attempt
      await logAuthEvent('login_failed', false, { 
        email: data.email, 
        details: error.message 
      });
      
      // For security, use a generic error message
      // But provide more details for common cases
      if (error.message.includes('Invalid login credentials')) {
        return { 
          error: `Invalid email or password${remainingAttempts > 0 ? `. ${remainingAttempts} attempts remaining` : ''}` 
        };
      }
      
      return { error: 'Login failed. Please try again.' };
    }

    // Step 5: Success path
    // Reset rate limit counter on successful login
    await resetRateLimit(rateLimitKey);
    
    // Log successful login
    await logAuthEvent('login_success', true, { 
      email: data.email,
      userId: authData.user?.id
    });

    // Return success
    return { error: null };
  } catch (err) {
    // Log unexpected errors
    console.error('Login error:', err);
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}

/**
 * User Registration Server Action
 * 
 * Creates new user accounts with the Supabase authentication service.
 * This function is fundamental to user acquisition and system security as it:
 * 1. Establishes new user identities in the authentication system
 * 2. Validates registration data to ensure data quality
 * 3. Prevents registration spam through rate limiting
 * 4. Creates the necessary user profile records
 * 
 * Used in: The registration page form submission process. This server action 
 * transforms anonymous visitors into authenticated users and creates the foundation
 * for user-specific data throughout the application.
 * 
 * @param {RegisterFormData} data - User registration data including email, password, and name
 * @returns {Promise<{error: string | null}>} Result object with error message if registration failed
 */
export async function register(data: RegisterFormData) {
  try {
    // Import validation utility
    const { validateRegisterForm } = await import('../utils/validation');
    const validation = validateRegisterForm(data);
    if (!validation.isValid) {
      return { error: validation.message };
    }

    // Apply rate limiting (for registration spam prevention)
    const { isRateLimited, logAuthEvent } = await import('../utils/security');
    const rateLimitKey = `register:${data.email.toLowerCase()}`;
    const { limited } = await isRateLimited(rateLimitKey);
    
    if (limited) {
      // Log excessive registration attempts
      await logAuthEvent('register_rate_limited', false, { 
        email: data.email,
        details: 'Registration rate limit exceeded' 
      });
      
      return { error: 'Too many registration attempts. Please try again later.' };
    }

    // Sanitize input - trim whitespace, etc.
    const sanitizedName = data.name.trim();
    
    // Attempt registration with Supabase
    const supabase = await createClient();
    const { error, data: authData } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: sanitizedName,
        },
      },
    });

    // Handle result and logging
    if (error) {
      // Log failed registration attempt
      await logAuthEvent('register_failed', false, { 
        email: data.email,
        details: error.message 
      });
      
      // Return a sanitized error message
      if (error.message.includes('already registered')) {
        return { error: 'This email address is already registered.' };
      }
      
      return { error: 'Registration failed. Please try again.' };
    }

    // Log successful registration
    await logAuthEvent('register_success', true, { 
      email: data.email,
      userId: authData?.user?.id
    });

    // Return success
    return { error: null };
  } catch (err) {
    // Log unexpected errors
    console.error('Registration error:', err);
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}

/**
 * User Logout Server Action
 * 
 * Terminates the user's active session and clears authentication state.
 * This function is essential to the application's security lifecycle as it:
 * 1. Properly ends authenticated sessions to prevent session hijacking
 * 2. Clears authentication tokens and state
 * 3. Records session termination for audit purposes
 * 4. Creates a clean transition between authenticated and unauthenticated states
 * 
 * Used in: The application header/navigation when users click logout, and potentially
 * in session timeout handlers. This action ensures proper security boundaries by
 * allowing users to explicitly terminate their access.
 * 
 * @returns {Promise<{error: string | null}>} Result object with error message if logout failed
 */
export async function logout() {
  try {
    // Get current user before logout for logging
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    const email = userData?.user?.email;
    
    // Attempt logout
    const { error } = await supabase.auth.signOut();
    
    // Handle errors
    if (error) {
      // Log failed logout attempt
      const { logAuthEvent } = await import('../utils/security');
      await logAuthEvent('logout_failed', false, { 
        userId,
        email,
        details: error.message 
      });
      
      return { error: 'Logout failed. Please try again.' };
    }
    
    // Log successful logout
    const { logAuthEvent } = await import('../utils/security');
    await logAuthEvent('logout_success', true, { 
      userId,
      email
    });
    
    return { error: null };
  } catch (err) {
    console.error('Logout error:', err);
    return { error: 'An unexpected error occurred during logout.' };
  }
}

/**
 * Current User Retrieval Function
 * 
 * Fetches information about the currently authenticated user from Supabase.
 * This function is central to the application's authentication context as it:
 * 1. Provides identity information for personalization throughout the app
 * 2. Enables authorization checks for protected resources and actions
 * 3. Serves as the source of truth for user authentication state
 * 4. Facilitates user-specific data queries and operations
 * 
 * Used in: The authentication context provider, authorization checks, and anywhere
 * the application needs to know about the current user's identity. This function
 * is frequently called during navigation and when performing user-specific operations.
 * 
 * @returns {Promise<User|null>} The current user object or null if not authenticated
 */
export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting current user:', error.message);
      return null;
    }
    
    return data.user;
  } catch (err) {
    console.error('Unexpected error in getCurrentUser:', err);
    return null;
  }
}

/**
 * Authentication Session Retrieval Function
 * 
 * Fetches the current authentication session state from Supabase.
 * This function is vital to the application's authentication lifecycle as it:
 * 1. Provides detailed session information beyond just user identity
 * 2. Enables session-based security features and checks
 * 3. Allows the application to verify token validity and expiration
 * 4. Supports middleware and server-side authentication verification
 * 
 * Used in: Authentication context providers, middleware, and server components
 * that need to verify the authentication state. This function is particularly
 * important for SSR and API routes that need access to the current session.
 * 
 * @returns {Promise<Session|null>} The current session object or null if not authenticated
 */
export async function getSession() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error.message);
      return null;
    }
    
    return data.session;
  } catch (err) {
    console.error('Unexpected error in getSession:', err);
    return null;
  }
}
