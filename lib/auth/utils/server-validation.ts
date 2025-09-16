'use server';

/**
 * Server-side Validation Module
 * 
 * This module provides validation functions for server-side use in auth actions.
 * These functions perform the same validations as their client-side counterparts
 * but are specifically designed to work within server actions.
 */

/**
 * Password Validation Result Type
 */
export interface PasswordValidationResult {
  valid: boolean;
  message: string | null;
}

/**
 * Form Validation Result Type
 */
export interface FormValidationResult {
  isValid: boolean;
  message: string | null;
}

/**
 * Login Form Data Type
 */
export interface LoginFormData {
  email: string;
  password: string;
}

/**
 * Register Form Data Type
 */
export interface RegisterFormData {
  email: string;
  password: string;
  name: string;
}

/**
 * Validate Email (Server-side)
 * 
 * Checks if an email address is valid
 */
export async function validateEmail(email: string): Promise<string | null> {
  if (!email) {
    return "Email is required";
  }
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address";
  }
  
  return null;
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

  return {
    valid: true,
    message: null
  };
}

/**
 * Validate Login Form (Server-side)
 * 
 * Validates login form data including email and password
 */
export async function validateLoginForm(data: LoginFormData): Promise<FormValidationResult> {
  const { email, password } = data;
  
  // Validate email
  const emailError = await validateEmail(email);
  if (emailError) {
    return {
      isValid: false,
      message: emailError
    };
  }
  
  // Validate password (basic presence check for login)
  if (!password || password.length < 1) {
    return {
      isValid: false,
      message: 'Please enter your password'
    };
  }
  
  return {
    isValid: true,
    message: null
  };
}

/**
 * Validate Register Form (Server-side)
 * 
 * Validates registration form data including email, password and name
 */
export async function validateRegisterForm(data: RegisterFormData): Promise<FormValidationResult> {
  const { email, password, name } = data;
  
  // Validate email
  const emailError = await validateEmail(email);
  if (emailError) {
    return {
      isValid: false,
      message: emailError
    };
  }
  
  // Validate password (with complexity requirements)
  const passwordResult = await validatePassword(password);
  if (!passwordResult.valid) {
    return {
      isValid: false,
      message: passwordResult.message
    };
  }
  
  // Validate name
  if (!name || name.trim().length < 2) {
    return {
      isValid: false,
      message: 'Please enter a valid name (minimum 2 characters)'
    };
  }
  
  return {
    isValid: true,
    message: null
  };
}