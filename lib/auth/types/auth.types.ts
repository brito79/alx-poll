'use strict';

import { Session, User } from '@supabase/supabase-js';

/**
 * Authentication Error Type
 * 
 * Extends Error to provide a consistent error type for authentication-related errors.
 */
export class AuthError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Authentication Result Type
 * 
 * Represents the result of an authentication operation like sign-in or sign-up.
 * This provides a consistent return type for all authentication functions.
 */
export interface AuthResult {
  /**
   * User object if authentication was successful, null otherwise
   */
  user: User | null;
  
  /**
   * Session object if authentication was successful, null otherwise
   */
  session: Session | null;
  
  /**
   * Error message if authentication failed, null on success
   */
  error: string | null;
}

/**
 * Reset Password Result Type
 * 
 * Represents the result of a password reset request.
 */
export interface ResetResult {
  /**
   * Whether the password reset email was sent successfully
   */
  emailSent: boolean;
  
  /**
   * Error message if the operation failed, null on success
   */
  error: string | null;
}

/**
 * Token Verification Result Type
 * 
 * Represents the result of verifying a reset token or similar.
 */
export interface VerificationResult {
  /**
   * Whether the token was verified successfully
   */
  verified: boolean;
  
  /**
   * Error message if verification failed, null on success
   */
  error: string | null;
}

/**
 * Session Validation Result Type
 * 
 * Represents the result of validating a session token.
 */
export interface SessionValidationResult {
  /**
   * Whether the session is valid
   */
  valid: boolean;
  
  /**
   * The user associated with the session, if valid
   */
  user: User | null;
  
  /**
   * The session object if valid, null otherwise
   */
  session: Session | null;
  
  /**
   * Error message if validation failed, null on success
   */
  error: string | null;
}

/**
 * Session Result Type
 * 
 * Represents the result of a session operation like refresh.
 */
export interface SessionResult {
  /**
   * The session object if operation was successful, null otherwise
   */
  session: Session | null;
  
  /**
   * Error message if the operation failed, null on success
   */
  error: string | null;
}

/**
 * Sign-in Form Data Type
 * 
 * Represents the data submitted via a sign-in form.
 */
export interface SignInFormData {
  /**
   * User's email address
   */
  email: string;
  
  /**
   * User's password
   */
  password: string;
  
  /**
   * Whether to remember the user's session
   */
  rememberMe?: boolean;
}

/**
 * Sign-up Form Data Type
 * 
 * Represents the data submitted via a sign-up form.
 */
export interface SignUpFormData {
  /**
   * User's email address
   */
  email: string;
  
  /**
   * User's password
   */
  password: string;
  
  /**
   * Additional user data
   */
  userData?: {
    /**
     * User's full name
     */
    fullName?: string;
    
    /**
     * User's username
     */
    username?: string;
    
    /**
     * User's avatar URL
     */
    avatarUrl?: string;
  };
}

/**
 * Reset Password Form Data Type
 * 
 * Represents the data submitted via a password reset form.
 */
export interface ResetPasswordFormData {
  /**
   * User's email address
   */
  email: string;
}

/**
 * Verify Reset Token Form Data Type
 * 
 * Represents the data submitted when verifying a reset token.
 */
export interface VerifyResetTokenFormData {
  /**
   * The reset token
   */
  token: string;
  
  /**
   * The new password
   */
  newPassword: string;
  
  /**
   * Confirmation of the new password
   */
  confirmPassword: string;
}