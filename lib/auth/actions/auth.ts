'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { 
  AuthResult, 
  SessionResult, 
  SignInFormData, 
  SignUpFormData, 
  ResetPasswordFormData, 
  VerifyResetTokenFormData, 
  ResetResult, 
  VerificationResult, 
  SessionValidationResult 
} from '../types/auth.types';
// Import server-side validation instead of client-side

import { isRateLimited, resetRateLimit, logAuthEvent } from '../utils/security';
import { validatePassword } from './server-validation';

/**
 * Sign-in Function
 * 
 * Authenticates users against the Supabase backend with comprehensive security measures.
 * This function is critical to the application's security model and is structured
 * according to the app's authentication architecture guidelines.
 * 
 * @param params - Authentication parameters object
 * @returns Promise with the authentication result
 */
export async function signIn({ 
  email, 
  password, 
  rememberMe = false 
}: SignInFormData): Promise<AuthResult> {
  try {
    // Apply rate limiting
    const rateLimitKey = `login:${email.toLowerCase()}`;
    const { limited, remainingAttempts } = await isRateLimited(rateLimitKey);
    
    if (limited) {
      // Log excessive attempts
      await logAuthEvent('login_rate_limited', false, { 
        email, 
        details: 'Rate limit exceeded' 
      });
      
      return { 
        user: null, 
        session: null, 
        error: 'Too many login attempts. Please try again later.' 
      };
    }

    // Attempt login with Supabase
    const supabase = await createClient();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    // Handle result and logging
    if (error) {
      // Log failed login attempt
      await logAuthEvent('login_failed', false, { 
        email, 
        details: error.message 
      });
      
      // For security, use a generic error message
      // But provide more details for common cases
      if (error.message.includes('Invalid login credentials')) {
        return { 
          user: null, 
          session: null, 
          error: `Invalid email or password${remainingAttempts > 0 ? `. ${remainingAttempts} attempts remaining` : ''}` 
        };
      }
      
      return { 
        user: null, 
        session: null, 
        error: 'Login failed. Please try again.' 
      };
    }

    // Reset rate limit counter on successful login
    await resetRateLimit(rateLimitKey);
    
    // Log successful login
    await logAuthEvent('login_success', true, { 
      email,
      userId: data.user?.id
    });

    // Return success
    return { 
      user: data.user, 
      session: data.session, 
      error: null 
    };
  } catch (err) {
    // Log unexpected errors
    console.error('Login error:', err);
    return { 
      user: null, 
      session: null, 
      error: 'An unexpected error occurred. Please try again.' 
    };
  }
}

/**
 * Sign-up Function
 * 
 * Creates new user accounts with the Supabase authentication service.
 * This function follows the app's authentication architecture guidelines
 * for consistent error handling and security practices.
 * 
 * @param params - Registration parameters object
 * @returns Promise with the authentication result
 */
export async function signUp({
  email,
  password,
  userData
}: SignUpFormData): Promise<AuthResult> {
  try {
    // Validate password complexity
    const passwordValidation = await validatePassword(password);
    if (!passwordValidation.valid) {
      return { 
        user: null, 
        session: null, 
        error: passwordValidation.message 
      };
    }

    // Apply rate limiting
    const rateLimitKey = `register:${email.toLowerCase()}`;
    const { limited } = await isRateLimited(rateLimitKey);
    
    if (limited) {
      // Log excessive registration attempts
      await logAuthEvent('register_rate_limited', false, { 
        email,
        details: 'Registration rate limit exceeded' 
      });
      
      return { 
        user: null, 
        session: null, 
        error: 'Too many registration attempts. Please try again later.' 
      };
    }
    
    // Attempt registration with Supabase
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: userData?.fullName || '',
          username: userData?.username || email.split('@')[0],
          avatar_url: userData?.avatarUrl || '',
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/email-confirmed`,
      },
    });

    // Handle result and logging
    if (error) {
      // Log failed registration attempt
      await logAuthEvent('register_failed', false, { 
        email,
        details: error.message 
      });
      
      // Return a sanitized error message
      if (error.message.includes('already registered')) {
        return { 
          user: null, 
          session: null, 
          error: 'This email address is already registered.' 
        };
      }
      
      return { 
        user: null, 
        session: null, 
        error: 'Registration failed. Please try again.' 
      };
    }

    // Log successful registration
    await logAuthEvent('register_success', true, { 
      email,
      userId: data.user?.id
    });

    // Return success
    return { 
      user: data.user, 
      session: data.session, 
      error: null 
    };
  } catch (err) {
    // Log unexpected errors
    console.error('Registration error:', err);
    return { 
      user: null, 
      session: null, 
      error: 'An unexpected error occurred. Please try again.' 
    };
  }
}

/**
 * Sign-out Function
 * 
 * Terminates the user's active session and clears authentication state.
 * This function follows the app's authentication architecture guidelines.
 * 
 * @param options - Sign-out options
 * @returns Promise that resolves when sign-out is complete
 */
export async function signOut({ 
  everywhere = false,
  redirectTo = '/login'
}: { 
  everywhere?: boolean, 
  redirectTo?: string 
} = {}): Promise<void> {
  try {
    // Get current user before logout for logging
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    const email = userData?.user?.email;
    
    // Attempt logout
    const { error } = await supabase.auth.signOut({
      scope: everywhere ? 'global' : 'local',
    });
    
    // Handle errors
    if (error) {
      // Log failed logout attempt
      await logAuthEvent('logout_failed', false, { 
        userId,
        email,
        details: error.message 
      });
      throw new Error('Logout failed. Please try again.');
    }
    
    // Log successful logout
    await logAuthEvent('logout_success', true, { 
      userId,
      email
    });
  } catch (err) {
    console.error('Logout error:', err);
    throw new Error('An unexpected error occurred during logout.');
  }
}

/**
 * Reset Password Function
 * 
 * Initiates the password reset process for a user.
 * This function follows the app's authentication architecture guidelines.
 * 
 * @param params - Reset password parameters
 * @returns Promise with the reset password result
 */
export async function resetPassword({
  email
}: ResetPasswordFormData): Promise<ResetResult> {
  try {
    // Apply rate limiting
    const rateLimitKey = `reset:${email.toLowerCase()}`;
    const { limited } = await isRateLimited(rateLimitKey);
    
    if (limited) {
      await logAuthEvent('reset_rate_limited', false, { 
        email,
        details: 'Reset rate limit exceeded' 
      });
      
      return { 
        emailSent: false,
        error: 'Too many password reset attempts. Please try again later.' 
      };
    }

    // Request password reset
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/reset-password`,
    });

    if (error) {
      await logAuthEvent('reset_failed', false, { 
        email,
        details: error.message 
      });
      
      return { 
        emailSent: false,
        error: 'Failed to send reset email. Please try again.' 
      };
    }

    await logAuthEvent('reset_requested', true, { email });
    
    return {
      emailSent: true,
      error: null
    };
  } catch (err) {
    console.error('Password reset error:', err);
    return { 
      emailSent: false, 
      error: 'An unexpected error occurred. Please try again.' 
    };
  }
}

/**
 * Verify Reset Token Function
 * 
 * Verifies a password reset token and updates the user's password.
 * This function follows the app's authentication architecture guidelines.
 * 
 * @param params - Verification parameters
 * @returns Promise with the verification result
 */
export async function verifyResetToken({
  token,
  newPassword
}: VerifyResetTokenFormData): Promise<VerificationResult> {
  try {
    // Validate password complexity using server-side validation to avoid client/server mismatch
    const passwordValidation = await validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return { 
        verified: false,
        error: passwordValidation.message 
      };
    }

    const supabase = await createClient();
    
    // First verify the reset token is valid
    const { error: verifyError, data: verifyData } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'recovery'
    });
    
    if (verifyError) {
      await logAuthEvent('password_reset_token_invalid', false, { 
        details: verifyError.message 
      });
      
      return {
        verified: false,
        error: 'Invalid or expired password reset token. Please request a new password reset link.'
      };
    }
    
    // Token is valid, update the password
    const { error, data } = await supabase.auth.updateUser({ 
      password: newPassword 
    });

    if (error) {
      await logAuthEvent('password_reset_failed', false, { 
        details: error.message 
      });
      
      return { 
        verified: false,
        error: 'Password reset failed. Please try again or request a new reset link.' 
      };
    }

    await logAuthEvent('password_reset_success', true, { 
      userId: data.user.id,
      email: data.user.email
    });
    
    return {
      verified: true,
      error: null
    };
  } catch (err) {
    console.error('Password update error:', err);
    return { 
      verified: false, 
      error: 'An unexpected error occurred. Please try again.' 
    };
  }
}

/**
 * Validate Session Function
 * 
 * Validates a session token to determine if it's still valid.
 * This function follows the app's authentication architecture guidelines.
 * 
 * @param token - Session token to validate
 * @returns Promise with the session validation result
 */
export async function validateSession(token: string): Promise<SessionValidationResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error) {
      return { 
        valid: false, 
        user: null, 
        session: null,
        error: 'Invalid or expired session.'
      };
    }
    
    // Get the session as well
    const sessionResult = await supabase.auth.getSession();
    
    return {
      valid: true,
      user: data.user,
      session: sessionResult.data.session,
      error: null
    };
  } catch (err) {
    console.error('Session validation error:', err);
    return { 
      valid: false, 
      user: null, 
      session: null,
      error: 'An unexpected error occurred validating the session.' 
    };
  }
}

/**
 * Refresh Session Function
 * 
 * Refreshes the current authentication session.
 * This function follows the app's authentication architecture guidelines.
 * 
 * @returns Promise with the session refresh result
 */
export async function refreshSession(): Promise<SessionResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      return { 
        session: null,
        error: 'Failed to refresh session.' 
      };
    }
    
    return {
      session: data.session,
      error: null
    };
  } catch (err) {
    console.error('Session refresh error:', err);
    return { 
      session: null,
      error: 'An unexpected error occurred refreshing the session.' 
    };
  }
}