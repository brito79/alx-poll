'use client';

/**
 * Password Validation Result Type
 * 
 * Represents the result of a password validation check.
 */
export interface PasswordValidationResult {
  /**
   * Whether the password meets all requirements
   */
  valid: boolean;
  
  /**
   * Error message if validation failed, null on success
   */
  message: string | null;
}

/**
 * Form Validation Result Type
 * 
 * Represents the result of form data validation.
 */
interface FormValidationResult {
  /**
   * Whether the form data is valid
   */
  isValid: boolean;
  
  /**
   * Error message if validation failed, null on success
   */
  message: string | null;
}

/**
 * Validate Email
 * 
 * Checks if an email address is valid.
 * 
 * @param email - The email to validate
 * @returns Error message if invalid, null if valid
 */
export function validateEmail(email: string): string | null {
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
 * Validate Password
 * 
 * Checks if a password meets the required complexity requirements.
 * 
 * @param password - The password to validate
 * @returns Validation result with success/failure and message
 */
export function validatePassword(password: string): PasswordValidationResult {
  // Check minimum length
  if (password.length < 8) {
    return { 
      valid: false, 
      message: 'Password must be at least 8 characters long'
    };
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { 
      valid: false, 
      message: 'Password must contain at least one uppercase letter'
    };
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { 
      valid: false, 
      message: 'Password must contain at least one lowercase letter'
    };
  }
  
  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    return { 
      valid: false, 
      message: 'Password must contain at least one number'
    };
  }
  
  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { 
      valid: false, 
      message: 'Password must contain at least one special character'
    };
  }
  
  // Check for common passwords (simplified example, would be larger in production)
  const commonPasswords = [
    'password123', 'admin123', '12345678', 'qwerty123', 
    'letmein123', 'welcome1', 'monkey123', 'sunshine1'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    return { 
      valid: false, 
      message: 'This password is too common. Please choose a more secure password'
    };
  }
  
  return { valid: true, message: null };
}

/**
 * Calculate Password Strength
 * 
 * Determines the strength of a password on a scale of 0-100.
 * Used for password strength indicators in the UI.
 * 
 * @param password - The password to evaluate
 * @returns A number from 0-100 representing password strength
 */
export function calculatePasswordStrength(password: string): number {
  if (!password) return 0;
  
  let strength = 0;
  
  // Length contribution (up to 25 points)
  strength += Math.min(25, password.length * 2);
  
  // Character variety contribution
  if (/[A-Z]/.test(password)) strength += 10; // uppercase
  if (/[a-z]/.test(password)) strength += 10; // lowercase
  if (/[0-9]/.test(password)) strength += 10; // numbers
  if (/[^A-Za-z0-9]/.test(password)) strength += 15; // special chars
  
  // Variety of characters (up to 20 points)
  const uniqueChars = new Set(password.split('')).size;
  strength += Math.min(20, uniqueChars * 2);
  
  // Pattern detection (negative points)
  if (/^[A-Za-z]+$/.test(password)) strength -= 10; // only letters
  if (/^[0-9]+$/.test(password)) strength -= 15; // only numbers
  if (/(.)\1{2,}/.test(password)) strength -= 10; // repeated characters
  
  // Common password patterns (negative points)
  if (/^(123|abc|qwerty|password|admin|welcome)/i.test(password)) strength -= 20;
  
  // Ensure strength is between 0-100
  return Math.max(0, Math.min(100, strength));
}

/**
 * Validate Login Form
 * 
 * Validates the login form data to ensure it meets requirements.
 * 
 * @param data - The login form data
 * @returns Validation result with success/failure and message
 */
export function validateLoginForm(data: { email: string, password: string }): FormValidationResult {
  // Validate email
  if (!data.email) {
    return { isValid: false, message: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    return { isValid: false, message: 'Please enter a valid email address' };
  }
  
  // Validate password
  if (!data.password) {
    return { isValid: false, message: 'Password is required' };
  }
  
  return { isValid: true, message: null };
}

/**
 * Validate Register Form
 * 
 * Validates the registration form data to ensure it meets all requirements.
 * 
 * @param data - The registration form data
 * @returns Validation result with success/failure and message
 */
export function validateRegisterForm(data: { 
  email: string,
  password: string,
  confirmPassword: string,
  name?: string
}): FormValidationResult {
  // Validate email
  if (!data.email) {
    return { isValid: false, message: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    return { isValid: false, message: 'Please enter a valid email address' };
  }
  
  // Validate password
  if (!data.password) {
    return { isValid: false, message: 'Password is required' };
  }
  
  // Validate password complexity
  const passwordResult = validatePassword(data.password);
  if (!passwordResult.valid) {
    return { isValid: false, message: passwordResult.message };
  }
  
  // Validate password confirmation
  if (data.password !== data.confirmPassword) {
    return { isValid: false, message: 'Passwords do not match' };
  }
  
  // Validate name if provided
  if (data.name && data.name.trim().length < 2) {
    return { isValid: false, message: 'Name must be at least 2 characters' };
  }
  
  return { isValid: true, message: null };
}