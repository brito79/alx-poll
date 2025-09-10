'use client';

import { LoginFormData, RegisterFormData } from '../types';

/**
 * Validates email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates password strength
 */
export function validatePassword(password: string): { isValid: boolean; message: string } {
  if (!password || password.length < 8) {
    return { 
      isValid: false, 
      message: 'Password must be at least 8 characters long'
    };
  }
  
  // Check for password complexity - recommended but not required
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  
  if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
    return { 
      isValid: false, 
      message: 'Password must contain uppercase, lowercase letters and numbers'
    };
  }
  
  return { isValid: true, message: '' };
}

/**
 * Validates login form data
 */
export function validateLoginForm(data: LoginFormData): { isValid: boolean; message: string } {
  if (!data.email || !validateEmail(data.email)) {
    return {
      isValid: false,
      message: 'Please enter a valid email address'
    };
  }
  
  if (!data.password) {
    return {
      isValid: false,
      message: 'Password is required'
    };
  }
  
  return { isValid: true, message: '' };
}

/**
 * Validates registration form data
 */
export function validateRegisterForm(data: RegisterFormData): { isValid: boolean; message: string } {
  // Check name
  if (!data.name || data.name.trim().length === 0) {
    return {
      isValid: false,
      message: 'Name is required'
    };
  }
  
  // Check email
  if (!data.email || !validateEmail(data.email)) {
    return {
      isValid: false,
      message: 'Please enter a valid email address'
    };
  }
  
  // Check password
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.isValid) {
    return passwordValidation;
  }
  
  return { isValid: true, message: '' };
}
