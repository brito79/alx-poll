'use server';

/**
 * Server-side Validation Module for Auth Actions
 * 
 * This module provides validation functions for server-side use in auth actions.
 */

/**
 * Password Validation Result Type
 */
export interface PasswordValidationResult {
  valid: boolean;
  message: string | null;
}

/**
 * Validate Password (Server-side)
 * 
 * Checks if a password meets the required complexity requirements
 */
export async function validatePassword(password: string): Promise<PasswordValidationResult> {
  // Check minimum length
  if (password.length < 8) {
    return { 
      valid: false, 
      message: 'Password must be at least 8 characters long'
    };
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter'
    };
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one lowercase letter'
    };
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one number'
    };
  }

  // Check for special character
  if (!/[^A-Za-z0-9]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one special character'
    };
  }
  
  // Check against common passwords (this would ideally use a more comprehensive list)
  const commonPasswords = [
    'password', 'password123', '123456', '12345678', 'qwerty',
    'letmein', 'welcome', 'admin', 'superman', 'iloveyou'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    return {
      valid: false,
      message: 'This password is too common and easily guessable. Please choose a stronger password.'
    };
  }

  return {
    valid: true,
    message: null
  };
}