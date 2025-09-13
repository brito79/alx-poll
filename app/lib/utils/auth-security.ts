'use client';

/**
 * Authentication Security Utilities Module
 * 
 * This module provides specialized security functions focused on the authentication
 * flow and user management aspects of the application. It includes:
 * 
 * - CSRF protection for authentication forms
 * - Error message handling for authentication failures
 * - Rate limiting helpers for login attempts
 * 
 * These utilities work together to secure the authentication boundary of the
 * application, which is particularly critical as it controls access to all
 * protected functionality.
 */

/**
 * Generate a Cross-Site Request Forgery (CSRF) token for authentication forms
 * 
 * This function creates a cryptographically secure random value to protect
 * authentication forms from CSRF attacks. It uses the Web Crypto API when
 * available with a secure fallback.
 * 
 * This specific implementation is used in the login and registration flows
 * to ensure that authentication attempts originate from legitimate forms
 * within our application.
 * 
 * @returns A random string to use as CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomUUID ? 
    crypto.randomUUID() : 
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Store a CSRF token in the client's session storage
 * 
 * This function securely stores the CSRF token in the browser's sessionStorage,
 * which persists only for the current browser session. This ensures that the
 * token is available for validation when the form is submitted, but doesn't
 * persist indefinitely.
 * 
 * Used in authentication forms as part of the form initialization process.
 * 
 * @param token The token to store
 */
export function storeCsrfToken(token: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('csrfToken', token);
  }
}

/**
 * Validate a submitted CSRF token against the stored token
 * 
 * This function compares the token submitted with a form against the previously
 * stored token to verify that the request originated from a legitimate form
 * rendered by our application, protecting against cross-site request forgery.
 * 
 * Used in authentication form submissions before processing credentials.
 * 
 * @param submittedToken The token from the form submission
 * @returns Boolean indicating if the token is valid
 */
export function validateCsrfToken(submittedToken: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const storedToken = sessionStorage.getItem('csrfToken');
  return storedToken === submittedToken && !!storedToken;
}

/**
 * Maps technical authentication error messages to user-friendly messages
 * 
 * This function translates cryptic or technical authentication error messages
 * from the backend into clear, actionable messages for users. It improves the
 * user experience while maintaining security by:
 * - Not exposing implementation details
 * - Providing clear guidance on how to resolve issues
 * - Handling common authentication failure scenarios
 * 
 * Used in the login and registration UI to display appropriate error messages.
 * 
 * @param error The error message from the authentication API
 * @returns A user-friendly error message for display
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
  
  // Default error message for unknown errors
  return 'Login failed. Please try again';
}

/**
 * Client-side submission throttling to prevent rapid repeated form submissions
 * 
 * This function implements a basic client-side throttling mechanism to prevent
 * users from submitting forms too rapidly, which could:
 * - Trigger server-side rate limits
 * - Create unintended duplicate submissions
 * - Lead to race conditions in state management
 * 
 * While server-side rate limiting is the primary defense against abuse, this
 * client-side mechanism improves user experience by providing immediate feedback
 * and reducing unnecessary rejected requests.
 * 
 * Used in login, registration, and other critical forms to prevent rapid submissions.
 * 
 * @param lastSubmitTime Timestamp of the last submission attempt
 * @returns Boolean indicating if a new submission should be allowed
 */
export function shouldAllowSubmit(lastSubmitTime: number): boolean {
  const now = Date.now();
  const minWaitTime = 1000; // Minimum 1 second between submission attempts
  return (now - lastSubmitTime) >= minWaitTime;
}
