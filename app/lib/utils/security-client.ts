'use client';

/**
 * Client-side Security Utilities Module
 * 
 * This module provides essential client-side security protections that can be used
 * in client components without requiring server-side functionality. The utilities
 * in this file focus on:
 * 
 * - CSRF protection for forms and state-changing operations
 * - Client-side input sanitization for XSS prevention
 * - Basic security validations that can run in the browser
 * 
 * These utilities form the first line of defense for client-side security
 * but should always be paired with server-side validation for complete protection.
 */

/**
 * Generates a Cross-Site Request Forgery (CSRF) token
 * 
 * This function creates a cryptographically secure random value using
 * the Web Crypto API when available, with a fallback to Math.random().
 * The token is used to protect forms and state-changing operations from
 * CSRF attacks by ensuring requests come from the legitimate UI.
 * 
 * Used in:
 * - Login/registration forms
 * - Poll creation and voting forms
 * - Any state-changing client-side operations
 * 
 * @returns A random string to use as a CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36);
}

/**
 * Validates a CSRF token against an expected value
 * 
 * This function verifies that the submitted token matches the original token,
 * ensuring that the request originated from a legitimate form rendered by our
 * application and not from a malicious third-party site.
 * 
 * @param token1 The original token (typically stored in state/session)
 * @param token2 The submitted token to validate
 * @returns Boolean indicating if the token is valid
 */
export function validateCSRFToken(token1: string, token2: string): boolean {
  return token1 === token2 && !!token1;
}

/**
 * Sanitizes text input to prevent Cross-Site Scripting (XSS) attacks
 * 
 * This function encodes potentially dangerous HTML characters to prevent
 * injected HTML/JavaScript from being interpreted by the browser. It's used
 * for sanitizing user-generated content before rendering it in the UI.
 * 
 * While React provides some built-in XSS protection through JSX escaping,
 * this function provides additional protection for:
 * - Content inserted via dangerouslySetInnerHTML
 * - Content used in non-React contexts
 * - URL parameters and other client-side data sources
 * 
 * @param text The user input string to sanitize
 * @returns Sanitized string with HTML special characters encoded
 */
export function sanitizeClientString(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/</g, '&lt;')       // Encode opening tags
    .replace(/>/g, '&gt;')       // Encode closing tags
    .replace(/"/g, '&quot;')     // Encode double quotes
    .replace(/'/g, '&#039;')     // Encode single quotes
    .trim();                     // Remove leading/trailing whitespace
}
