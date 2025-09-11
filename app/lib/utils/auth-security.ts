'use client';

/**
 * Generate a CSRF token for form protection
 * @returns A random string to use as CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomUUID ? 
    crypto.randomUUID() : 
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Store a CSRF token in the client's session storage
 * @param token The token to store
 */
export function storeCsrfToken(token: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('csrfToken', token);
  }
}

/**
 * Validate a submitted CSRF token against the stored one
 * @param submittedToken The token from the form submission
 * @returns Boolean indicating if the token is valid
 */
export function validateCsrfToken(submittedToken: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const storedToken = sessionStorage.getItem('csrfToken');
  return storedToken === submittedToken && !!storedToken;
}

/**
 * Maps API error messages to user-friendly messages
 * @param error The error message from the API
 * @returns A user-friendly error message
 */
export function mapAuthErrorToUserMessage(error: string): string {
  if (!error) return '';
  
  if (error.includes('Invalid email or password')) {
    return 'Email or password is incorrect';
  } else if (error.includes('Too many login attempts')) {
    return 'Too many login attempts. Please try again later';
  } else if (error.includes('network')) {
    return 'Unable to connect to the authentication service';
  }
  
  // Default error message
  return 'Login failed. Please try again';
}

/**
 * Simple client-side rate limiting for form submissions
 * @param lastSubmitTime Timestamp of the last submission attempt
 * @returns Boolean indicating if submission should be allowed
 */
export function shouldAllowSubmit(lastSubmitTime: number): boolean {
  const now = Date.now();
  const minWaitTime = 1000; // 1 second between submission attempts
  return (now - lastSubmitTime) >= minWaitTime;
}
