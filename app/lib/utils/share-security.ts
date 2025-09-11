'use client';

/**
 * Utility functions for URL and sharing security
 */

// Validate poll ID format (UUID)
export function isValidPollId(pollId: string): boolean {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return UUID_REGEX.test(pollId);
}

// Sanitize text for sharing
export function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim();
}

// Generate secure window features for window.open
export function getSecureWindowFeatures(): string {
  return 'noopener,noreferrer,toolbar=0,status=0,width=620,height=450';
}

// Validate URL is from trusted domain
export function isValidShareUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    // List of domains we allow sharing to
    const allowedDomains = [
      window.location.hostname,
      'twitter.com',
      'facebook.com',
      'linkedin.com'
    ];
    
    return allowedDomains.some(domain => parsedUrl.hostname.endsWith(domain));
  } catch {
    return false;
  }
}
