'use server';

/**
 * Security Utilities Module
 * 
 * This module provides comprehensive security features for the entire application including:
 * - Security event logging for audit trails
 * - Rate limiting mechanisms to prevent abuse
 * - Authentication protection
 * - Brute force prevention
 * 
 * The security utilities in this file form the core protection layer against
 * common attack vectors including brute force attacks, API abuse, and credential
 * stuffing attempts. It works alongside database RLS policies and middleware
 * to create defense in depth.
 */

type LogLevel = 'info' | 'warn' | 'error';

/**
 * Structure for security events to ensure consistent logging format
 */
type SecurityEvent = {
  event: string;          // Type of security event (login_attempt, poll_access, etc)
  email?: string;         // Associated user email when applicable
  userId?: string;        // User ID for authenticated actions
  pollId?: string;        // Poll ID for poll-related security events
  success: boolean;       // Whether the operation succeeded or was rejected
  details?: string;       // Additional context about the event
  timestamp: string;      // ISO timestamp when the event occurred
};

/**
 * In-memory rate limiting store for tracking request frequencies
 * 
 * In a production environment, this would be replaced with a distributed
 * storage solution like Redis to handle horizontal scaling and maintain
 * rate limit state across multiple server instances.
 */
const rateLimitStore: {
  [key: string]: { count: number; resetTime: number }
} = {};

/**
 * Logs security-related events for monitoring, auditing and threat detection
 * 
 * This function centralizes all security event logging to provide a consistent
 * audit trail for security-relevant actions across the application. It's used by:
 * - Authentication flows to track login attempts and failures
 * - Poll management to log access and modification attempts
 * - API endpoints to track unusual activity patterns
 * 
 * In production, this would connect to a security information and event management
 * (SIEM) system or specialized logging service to enable proper security monitoring.
 * 
 * @param event The type of security event being logged
 * @param success Whether the action succeeded or was blocked
 * @param data Additional context data for the security event
 */
export async function logSecurityEvent(
  event: string,
  success: boolean,
  data: { email?: string; userId?: string; pollId?: string; details?: string }
): Promise<void> {
  // Create structured log entry with consistent format
  const logEntry: SecurityEvent = {
    event,
    email: data.email,
    userId: data.userId,
    pollId: data.pollId,
    success,
    details: data.details,
    timestamp: new Date().toISOString(),
  };

  // Set appropriate log level based on event success
  // Failed security events are more concerning and get higher visibility
  const level: LogLevel = success ? 'info' : 'warn';
  
  // Log to server console with security prefix for filtering
  console[level]('[SECURITY]', JSON.stringify(logEntry));
  
  // TODO: In a production environment, consider:
  // 1. Storing logs in database
  // 2. Sending to external monitoring service
  // 3. Alerting on suspicious activity
}

/**
 * Legacy authentication event logging function
 * 
 * Maintained for backward compatibility with existing code that hasn't
 * been migrated to the newer logSecurityEvent function. All calls are
 * forwarded to the centralized security event logging.
 * 
 * @deprecated Use logSecurityEvent instead for all new code
 * @param event The auth event type being logged
 * @param success Whether the auth action succeeded
 * @param data Additional context for the auth event
 */
export async function logAuthEvent(
  event: string,
  success: boolean,
  data: { email?: string; userId?: string; details?: string }
): Promise<void> {
  return logSecurityEvent(event, success, data);
}

/**
 * Core rate limiting function to prevent API abuse
 * 
 * This flexible rate limiting implementation:
 * - Tracks usage across different actions by identity
 * - Enforces customizable limits per action type
 * - Provides remaining attempt counts for UX feedback
 * - Logs security events when limits are exceeded
 * 
 * Used throughout the application to protect:
 * - Authentication endpoints from brute force attacks
 * - Poll creation/voting from spam and abuse
 * - API endpoints from DoS attempts
 * 
 * @param key Unique identifier for the rate limited entity (userId, IP, etc)
 * @param action The action being rate limited (e.g., 'login', 'createPoll')
 * @param limit Maximum number of attempts within the window
 * @param windowMs Time window in milliseconds (default: 1 hour)
 * @returns Object with allowed status, reset time, and remaining attempts
 */
export async function checkRateLimit(
  key: string,
  action: string,
  limit: number,
  windowMs = 60 * 60 * 1000
): Promise<{ allowed: boolean; resetTime: Date; remaining: number }> {
  const now = Date.now();
  const identifier = `${key}:${action}`;

  // Initialize new rate limit counters or reset expired ones
  if (!rateLimitStore[identifier] || rateLimitStore[identifier].resetTime < now) {
    rateLimitStore[identifier] = {
      count: 0,
      resetTime: now + windowMs
    };
  }

  // Increment usage counter for this action and identifier
  rateLimitStore[identifier].count++;
  
  // Calculate remaining attempts and determine if action is allowed
  const { count, resetTime } = rateLimitStore[identifier];
  const remaining = Math.max(0, limit - count);
  const allowed = count <= limit;

  // Create security audit trail when rate limits are exceeded
  if (!allowed) {
    await logSecurityEvent(
      'rate_limit_exceeded',
      false,
      { 
        // Extract userId from identifier when present in expected format
        userId: key.includes('user_') ? key.replace('user_', '') : undefined,
        details: `Action "${action}" rate limited. Limit: ${limit}, Count: ${count}`
      }
    );
  }

  // Return comprehensive rate limit information
  return {
    allowed,
    resetTime: new Date(resetTime),
    remaining
  };
}

/**
 * Poll-specific rate limiting with predefined thresholds
 * 
 * This specialized rate limiting function enforces usage constraints
 * specific to poll operations, with different thresholds based on
 * the operation type. It protects against:
 * - Poll creation spam
 * - Vote manipulation
 * - Mass deletion of polls
 * 
 * Used in all poll-related server actions to ensure fair usage and
 * prevent system abuse by malicious users.
 * 
 * @param userId User ID performing the poll action
 * @param action Specific poll action being performed
 * @returns Boolean indicating if the action is allowed
 */
export async function checkPollActionRateLimit(userId: string, action: string): Promise<boolean> {
  let limit: number;
  
  // Action-specific thresholds based on expected usage patterns
  // and potential for abuse
  switch (action) {
    case 'createPoll':
      limit = 10; // 10 polls per hour - prevents poll spam
      break;
    case 'votePoll':
      limit = 30; // 30 votes per hour - prevents vote manipulation
      break;
    case 'deletePoll':
      limit = 15; // 15 deletes per hour - prevents mass deletion
      break;
    default:
      limit = 60; // Default limit for other poll-related actions
  }
  
  // Delegate to the core rate limiting function with poll-specific settings
  const result = await checkRateLimit(`user_${userId}`, action, limit);
  return result.allowed;
}

/**
 * Specialized in-memory store for tracking login attempts
 * 
 * This map tracks login attempts by identifier (email/IP) to implement
 * a progressive slowdown and lockout mechanism for repeated failed login
 * attempts, protecting against brute force and credential stuffing attacks.
 */
const loginAttempts = new Map<string, { count: number; firstAttempt: Date }>();

/**
 * Login-specific rate limiting function to prevent brute force attacks
 * 
 * This function implements a specialized rate limiting approach for login
 * attempts with:
 * - Short timeframe (15 minutes) to prevent quick brute force attempts
 * - Low threshold (5 attempts) before temporary lockout
 * - Identifier-based tracking (typically email address or IP)
 * - Attempt counter that resets after successful authentication
 * 
 * Used in the authentication flow to:
 * - Slow down credential stuffing attacks
 * - Prevent brute force password guessing
 * - Protect user accounts from unauthorized access
 * - Provide appropriate feedback to legitimate users
 * 
 * @param identifier Unique identifier for the login attempt (email/IP)
 * @returns Object with rate limit status and remaining attempts
 */
export async function isRateLimited(identifier: string): Promise<{ limited: boolean; remainingAttempts: number }> {
  const MAX_ATTEMPTS = 5;          // Maximum login attempts before lockout
  const WINDOW_MS = 15 * 60 * 1000; // 15-minute sliding window
  const now = new Date();
  
  // Retrieve existing attempts or initialize new tracking
  const attempts = loginAttempts.get(identifier) || { count: 0, firstAttempt: now };
  
  // Reset counter if the time window has expired
  if ((now.getTime() - attempts.firstAttempt.getTime()) > WINDOW_MS) {
    loginAttempts.set(identifier, { count: 1, firstAttempt: now });
    return { limited: false, remainingAttempts: MAX_ATTEMPTS - 1 };
  }
  
  // Increment the attempt counter within the time window
  attempts.count += 1;
  loginAttempts.set(identifier, attempts);
  
  // Determine if the rate limit has been exceeded
  const limited = attempts.count > MAX_ATTEMPTS;
  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - attempts.count);
  
  return { limited, remainingAttempts };
}

/**
 * Resets the login rate limit counter after successful authentication
 * 
 * This function clears the attempt counter when a user successfully
 * authenticates, ensuring legitimate users aren't penalized by previous
 * failed attempts once they provide valid credentials.
 * 
 * Called as part of the successful login flow to restore normal access.
 * 
 * @param identifier The identifier to clear rate limiting for
 */
export async function resetRateLimit(identifier: string): Promise<void> {
  loginAttempts.delete(identifier);
}
