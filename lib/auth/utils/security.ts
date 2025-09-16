'use server';

/**
 * Authentication Security Utilities Module
 * 
 * This module provides specialized security functions focused on the authentication
 * flow and user management aspects of the application.
 */

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

/**
 * Rate Limiting Result Type
 * 
 * Represents the result of a rate limit check.
 */
interface RateLimitResult {
  /**
   * Whether the request is rate limited
   */
  limited: boolean;
  
  /**
   * The number of attempts remaining before being rate limited
   */
  remainingAttempts: number;
}

/**
 * Rate limit configuration by action type
 */
const RATE_LIMIT_CONFIG = {
  login: { maxAttempts: 5, windowSeconds: 300 }, // 5 attempts per 5 minutes
  register: { maxAttempts: 3, windowSeconds: 600 }, // 3 attempts per 10 minutes
  reset: { maxAttempts: 3, windowSeconds: 600 }, // 3 attempts per 10 minutes
  default: { maxAttempts: 10, windowSeconds: 600 }, // Default fallback
};

/**
 * Check if an action is rate limited
 * 
 * Implements a server-side rate limiting mechanism to prevent brute force attacks.
 * This is a critical security control for protecting authentication endpoints.
 * 
 * @param key - Unique key to identify the rate limited action
 * @returns Rate limiting status including whether limited and remaining attempts
 */
export async function isRateLimited(key: string): Promise<RateLimitResult> {
  try {
    // Get action type from key prefix
    const actionType = key.split(':')[0] || 'default';
    const config = RATE_LIMIT_CONFIG[actionType as keyof typeof RATE_LIMIT_CONFIG] || RATE_LIMIT_CONFIG.default;
    
    // Use Redis for production, fallback to in-memory for demo
    // For a real implementation, you'd use a persistent store like Redis
    // This is a simplified demonstration using Supabase as storage
    
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - config.windowSeconds;
    
    // Connect to Supabase
    const supabase = await createClient();
    
    // Check current attempts in the time window
    const { data, error } = await supabase
      .from('rate_limits')
      .select('attempts, last_attempt')
      .eq('key', key)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Rate limit check error:', error);
      return { limited: false, remainingAttempts: config.maxAttempts }; // Fail open for user experience
    }
    
    // If no record or expired window, create/reset the counter
    if (!data || data.last_attempt < windowStart) {
      await supabase
        .from('rate_limits')
        .upsert({ key, attempts: 1, last_attempt: now });
      
      return { limited: false, remainingAttempts: config.maxAttempts - 1 };
    }
    
    // If within window, increment and check against limit
    const newAttempts = data.attempts + 1;
    await supabase
      .from('rate_limits')
      .upsert({ key, attempts: newAttempts, last_attempt: now });
    
    const isLimited = newAttempts > config.maxAttempts;
    const remaining = Math.max(0, config.maxAttempts - newAttempts);
    
    return { 
      limited: isLimited,
      remainingAttempts: remaining
    };
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Fail open to avoid blocking legitimate users
    return { limited: false, remainingAttempts: 1 };
  }
}

/**
 * Reset the rate limit counter for a key
 * 
 * Clears rate limiting after successful authentication to improve user experience.
 * 
 * @param key - The rate limit key to reset
 */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    const supabase = await createClient();
    
    await supabase
      .from('rate_limits')
      .delete()
      .eq('key', key);
  } catch (error) {
    console.error('Error resetting rate limit:', error);
  }
}

/**
 * Log authentication-related events
 * 
 * Records security events for audit purposes and threat detection.
 * This is a critical security control for monitoring authentication activities.
 * 
 * @param eventType - Type of authentication event
 * @param success - Whether the event was successful
 * @param details - Additional details about the event
 */
export async function logAuthEvent(
  eventType: string,
  success: boolean,
  details: Record<string, any>
): Promise<void> {
  try {
    // Use enhanced security logging
    const { logSecurityEvent, SecurityEventType, SecurityEventSeverity } = await import('./security-logging');
    
    // Map event type to SecurityEventType enum
    const eventTypeMap: Record<string, any> = {
      'login_success': SecurityEventType.LOGIN_SUCCESS,
      'login_failed': SecurityEventType.LOGIN_FAILED,
      'login_rate_limited': SecurityEventType.LOGIN_RATE_LIMITED,
      'register_success': SecurityEventType.REGISTER_SUCCESS,
      'register_failed': SecurityEventType.REGISTER_FAILED,
      'register_rate_limited': SecurityEventType.REGISTER_RATE_LIMITED,
      'logout_success': SecurityEventType.LOGOUT_SUCCESS,
      'logout_failed': SecurityEventType.LOGOUT_FAILED,
      'reset_requested': SecurityEventType.PASSWORD_RESET_REQUESTED,
      'password_reset_success': SecurityEventType.PASSWORD_RESET_SUCCESS,
      'password_reset_failed': SecurityEventType.PASSWORD_RESET_FAILED,
      'password_reset_token_invalid': SecurityEventType.PASSWORD_RESET_TOKEN_INVALID,
    };
    
    // Determine severity based on event type and success
    let severity = SecurityEventSeverity.LOW;
    if (!success) {
      if (eventType.includes('rate_limited')) {
        severity = SecurityEventSeverity.HIGH;
      } else if (eventType.includes('failed')) {
        severity = SecurityEventSeverity.MEDIUM;
      }
    }
    
    await logSecurityEvent({
      type: eventTypeMap[eventType] || eventType as any,
      severity,
      success,
      userId: details.userId,
      email: details.email,
      details
    });
  } catch (error) {
    // Fallback to basic logging
    console.error('Enhanced logging failed, using fallback:', error);
    await basicLogAuthEvent(eventType, success, details);
  }
}

/**
 * Fallback basic logging function
 */
async function basicLogAuthEvent(
  eventType: string,
  success: boolean,
  details: Record<string, any>
): Promise<void> {
  try {
    const supabase = await createClient();
    
    await supabase.from('auth_logs').insert({
      event_type: eventType,
      success,
      details,
      ip_address: '', // Would capture from request in production
      user_agent: '', // Would capture from request in production
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Log errors but don't block the authentication flow
    console.error('Error logging auth event:', error);
  }
}

/**
 * Generate a Cross-Site Request Forgery (CSRF) token for authentication forms
 * 
 * This function creates a cryptographically secure random value to protect
 * authentication forms from CSRF attacks.
 * 
 * @returns A random string to use as CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomUUID ? 
    crypto.randomUUID() : 
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Store a CSRF token in an HTTP-only cookie
 * 
 * This function securely stores the CSRF token in an HTTP-only cookie,
 * which provides better security than client-side storage.
 * 
 * @param token - The token to store
 */
export async function storeCsrfToken(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('csrf_token', token, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600, // 1 hour
    path: '/'
  });
}

/**
 * Validate a submitted CSRF token against the stored token
 * 
 * This function compares the token submitted with a form against the previously
 * stored token to verify that the request originated from a legitimate form.
 * 
 * @param submittedToken - The token from the form submission
 * @returns Boolean indicating if the token is valid
 */
export async function validateCsrfToken(submittedToken: string): Promise<boolean> {
  const cookieStore = await cookies();
  const storedToken = cookieStore.get('csrf_token')?.value;
  const isValid = storedToken === submittedToken && !!storedToken;
  
  if (isValid) {
    // Rotate token after successful validation for enhanced security
    const newToken = generateCsrfToken();
    await storeCsrfToken(newToken);
  }
  
  return isValid;
}

/**
 * Maps technical authentication error messages to user-friendly messages
 * 
 * This function translates cryptic or technical authentication error messages
 * from the backend into clear, actionable messages for users.
 * 
 * @param error - The error message from the authentication API
 * @returns A user-friendly error message for display
 */
export function mapAuthErrorToUserMessage(error: string): string {
  if (!error) return '';
  
  const errorMap: Record<string, string> = {
    'Invalid login credentials': 'Email or password is incorrect',
    'Email not confirmed': 'Please verify your email address before logging in',
    'Password should be at least 8 characters': 'Password must be at least 8 characters long',
    'User already registered': 'An account with this email already exists',
    'Rate limit exceeded': 'Too many attempts. Please try again later',
    'Token expired': 'Your session has expired. Please log in again',
    'Invalid token': 'Authentication failed. Please log in again',
    'Email link is invalid or has expired': 'The reset link is invalid or has expired'
  };
  
  // Look for partial matches
  for (const [key, value] of Object.entries(errorMap)) {
    if (error.includes(key)) {
      return value;
    }
  }
  
  // Network-related errors
  if (error.includes('network') || error.includes('connection')) {
    return 'Unable to connect to the authentication service. Please check your internet connection';
  }
  
  // Default error message for unknown errors
  return 'Authentication error. Please try again';
}