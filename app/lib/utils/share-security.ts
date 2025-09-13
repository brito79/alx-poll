'use client';

/**
 * Poll Sharing Security Utilities Module
 * 
 * This module provides specialized security functions for the poll sharing
 * feature of the application. It focuses on:
 * 
 * - URL validation and sanitization for sharing links
 * - Content sanitization for shared poll data
 * - Secure window configuration for social sharing
 * - Input validation for poll identifiers
 * 
 * These utilities work together to ensure that the poll sharing functionality
 * is secure against common web vulnerabilities and prevents malicious sharing
 * or data injection.
 */

/**
 * Validates a poll ID to ensure it matches the expected UUID format
 * 
 * This function verifies that poll identifiers conform to the UUID standard
 * used throughout the application, preventing injection of malformed or
 * malicious identifiers that might be used for parameter tampering attacks.
 * 
 * Used in:
 * - URL parameter validation for poll routes
 * - API requests involving poll identifiers
 * - Before any database queries using poll IDs
 * 
 * @param pollId The poll identifier to validate
 * @returns Boolean indicating if the poll ID is valid
 */
export function isValidPollId(pollId: string): boolean {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return UUID_REGEX.test(pollId);
}

/**
 * Sanitizes text content for secure sharing
 * 
 * This function removes potentially dangerous HTML characters from text
 * that will be included in shared content, preventing XSS attacks when
 * poll content is shared via social media or direct links.
 * 
 * Used specifically in the poll sharing feature to ensure that poll titles
 * and descriptions cannot contain executable code when shared externally.
 * 
 * @param text The text content to sanitize
 * @returns Sanitized string with HTML special characters encoded
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/</g, '&lt;')       // Encode opening tags
    .replace(/>/g, '&gt;')       // Encode closing tags
    .replace(/"/g, '&quot;')     // Encode double quotes
    .replace(/'/g, '&#039;')     // Encode single quotes
    .trim();                     // Remove leading/trailing whitespace
}

/**
 * Generates secure window features for social sharing popups
 * 
 * This function returns a string of security-focused window features
 * for use with window.open() when sharing polls to social media.
 * It applies security best practices to prevent:
 * - Tabnabbing attacks
 * - Window manipulation exploits
 * - Information leakage between windows
 * 
 * Used when opening sharing dialogs for Twitter, Facebook, etc.
 * 
 * @returns String of secure window.open() features
 */
export function getSecureWindowFeatures(): string {
  return 'noopener,noreferrer,toolbar=0,status=0,width=620,height=450';
}

/**
 * Validates that a sharing URL belongs to a trusted domain
 * 
 * This function checks if a URL is from an allowed domain before permitting
 * redirection or sharing. It prevents:
 * - Open redirect vulnerabilities
 * - Sharing to potentially malicious domains
 * - Data exfiltration through unauthorized sharing
 * 
 * Used in the sharing feature to validate destination URLs before
 * allowing content to be shared.
 * 
 * @param url The URL to validate
 * @returns Boolean indicating if the URL is from a trusted domain
 */
export function isValidShareUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    // Whitelist of explicitly allowed sharing domains
    const allowedDomains = [
      window.location.hostname, // Allow sharing to the same domain
      'twitter.com',           // Twitter sharing
      'facebook.com',          // Facebook sharing
      'linkedin.com'           // LinkedIn sharing
    ];
    
    // Verify the hostname ends with one of our allowed domains
    return allowedDomains.some(domain => parsedUrl.hostname.endsWith(domain));
  } catch {
    // URL parsing failed - consider invalid
    return false;
  }
}
