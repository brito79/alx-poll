'use server';

type LogLevel = 'info' | 'warn' | 'error';

type SecurityEvent = {
  event: string;
  email?: string;
  userId?: string;
  pollId?: string;
  success: boolean;
  details?: string;
  timestamp: string;
};

// Simple in-memory rate limiting store
// In production, use Redis or similar distributed store
const rateLimitStore: {
  [key: string]: { count: number; resetTime: number }
} = {};

/**
 * Logs security-related events for monitoring
 */
export async function logSecurityEvent(
  event: string,
  success: boolean,
  data: { email?: string; userId?: string; pollId?: string; details?: string }
): Promise<void> {
  // Create log entry
  const logEntry: SecurityEvent = {
    event,
    email: data.email,
    userId: data.userId,
    pollId: data.pollId,
    success,
    details: data.details,
    timestamp: new Date().toISOString(),
  };

  // In production, you would send this to a proper logging service
  // For now, we'll console.log it (this will appear in server logs)
  const level: LogLevel = success ? 'info' : 'warn';
  
  // Log to console
  console[level]('[SECURITY]', JSON.stringify(logEntry));
  
  // TODO: In a production environment, consider:
  // 1. Storing logs in database
  // 2. Sending to external monitoring service
  // 3. Alerting on suspicious activity
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use logSecurityEvent instead
 */
export async function logAuthEvent(
  event: string,
  success: boolean,
  data: { email?: string; userId?: string; details?: string }
): Promise<void> {
  return logSecurityEvent(event, success, data);
}

/**
 * Rate limiting function for various actions
 * @param key Unique identifier for the rate limited entity (userId, IP, etc)
 * @param action The action being rate limited (e.g., 'login', 'createPoll')
 * @param limit Maximum number of attempts within the window
 * @param windowMs Time window in milliseconds (default: 1 hour)
 * @returns Object with allowed (boolean) and resetTime (Date)
 */
export async function checkRateLimit(
  key: string,
  action: string,
  limit: number,
  windowMs = 60 * 60 * 1000
): Promise<{ allowed: boolean; resetTime: Date; remaining: number }> {
  const now = Date.now();
  const identifier = `${key}:${action}`;

  // Initialize or retrieve rate limit data
  if (!rateLimitStore[identifier] || rateLimitStore[identifier].resetTime < now) {
    rateLimitStore[identifier] = {
      count: 0,
      resetTime: now + windowMs
    };
  }

  // Increment counter
  rateLimitStore[identifier].count++;
  
  const { count, resetTime } = rateLimitStore[identifier];
  const remaining = Math.max(0, limit - count);
  const allowed = count <= limit;

  // Log rate limit event if denied
  if (!allowed) {
    await logSecurityEvent(
      'rate_limit_exceeded',
      false,
      { 
        userId: key.includes('user_') ? key.replace('user_', '') : undefined,
        details: `Action "${action}" rate limited. Limit: ${limit}, Count: ${count}`
      }
    );
  }

  return {
    allowed,
    resetTime: new Date(resetTime),
    remaining
  };
}

/**
 * Checks if poll action is within rate limits
 * @param userId User ID performing the action
 * @param action Action type (create, vote, etc)
 * @returns True if allowed, false if rate limited
 */
export async function checkPollActionRateLimit(userId: string, action: string): Promise<boolean> {
  let limit: number;
  
  // Set limits for different actions
  switch (action) {
    case 'createPoll':
      limit = 10; // 10 polls per hour
      break;
    case 'votePoll':
      limit = 30; // 30 votes per hour
      break;
    case 'deletePoll':
      limit = 15; // 15 deletes per hour
      break;
    default:
      limit = 60; // Default limit for other actions
  }
  
  const result = await checkRateLimit(`user_${userId}`, action, limit);
  return result.allowed;
}

// Store login attempt counts for rate limiting
const loginAttempts = new Map<string, { count: number; firstAttempt: Date }>();

/**
 * Checks if a user/email has exceeded login attempt limits
 * Returns true if rate limit exceeded, false otherwise
 */
export async function isRateLimited(identifier: string): Promise<{ limited: boolean; remainingAttempts: number }> {
  const MAX_ATTEMPTS = 5;
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  const now = new Date();
  
  // Get existing attempts or initialize
  const attempts = loginAttempts.get(identifier) || { count: 0, firstAttempt: now };
  
  // Check if window has expired and reset if needed
  if ((now.getTime() - attempts.firstAttempt.getTime()) > WINDOW_MS) {
    loginAttempts.set(identifier, { count: 1, firstAttempt: now });
    return { limited: false, remainingAttempts: MAX_ATTEMPTS - 1 };
  }
  
  // Increment attempt count
  attempts.count += 1;
  loginAttempts.set(identifier, attempts);
  
  // Check if exceeded
  const limited = attempts.count > MAX_ATTEMPTS;
  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - attempts.count);
  
  return { limited, remainingAttempts };
}

/**
 * Reset rate limit counter (e.g., after successful login)
 */
export async function resetRateLimit(identifier: string): Promise<void> {
  loginAttempts.delete(identifier);
}
