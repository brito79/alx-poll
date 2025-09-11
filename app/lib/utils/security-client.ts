'use client';

/**
 * Client-side security utilities that don't require server-side functionality
 */

// Export basic security utilities for use in client components
export function generateCSRFToken(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36);
}

export function validateCSRFToken(token1: string, token2: string): boolean {
  return token1 === token2 && !!token1;
}

/**
 * Sanitizes text input to prevent XSS (client-side version)
 */
export function sanitizeClientString(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim();
}
