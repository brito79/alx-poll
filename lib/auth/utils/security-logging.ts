'use server';

/**
 * Enhanced Security Event Logging Module
 * 
 * This module provides comprehensive security event logging with structured
 * data, threat detection, and audit trail capabilities. It extends the basic
 * logging functionality to provide enterprise-grade security monitoring.
 */

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

/**
 * Security Event Types - Categorized for better analysis
 */
export enum SecurityEventType {
  // Authentication Events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGIN_RATE_LIMITED = 'login_rate_limited',
  LOGOUT_SUCCESS = 'logout_success',
  LOGOUT_FAILED = 'logout_failed',
  
  // Registration Events
  REGISTER_SUCCESS = 'register_success',
  REGISTER_FAILED = 'register_failed',
  REGISTER_RATE_LIMITED = 'register_rate_limited',
  
  // Password Events
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_SUCCESS = 'password_reset_success',
  PASSWORD_RESET_FAILED = 'password_reset_failed',
  PASSWORD_RESET_TOKEN_INVALID = 'password_reset_token_invalid',
  
  // Session Events
  SESSION_EXPIRED = 'session_expired',
  SESSION_REFRESH_SUCCESS = 'session_refresh_success',
  SESSION_REFRESH_FAILED = 'session_refresh_failed',
  SESSION_HIJACK_ATTEMPT = 'session_hijack_attempt',
  
  // Access Control Events
  UNAUTHORIZED_ACCESS_ATTEMPT = 'unauthorized_access_attempt',
  PRIVILEGE_ESCALATION_ATTEMPT = 'privilege_escalation_attempt',
  RESOURCE_ACCESS_DENIED = 'resource_access_denied',
  
  // Suspicious Activity
  MULTIPLE_FAILED_ATTEMPTS = 'multiple_failed_attempts',
  UNUSUAL_LOCATION_LOGIN = 'unusual_location_login',
  CONCURRENT_SESSIONS = 'concurrent_sessions',
  BRUTE_FORCE_DETECTED = 'brute_force_detected',
  
  // System Security
  CSRF_TOKEN_MISMATCH = 'csrf_token_mismatch',
  INVALID_REQUEST_SIGNATURE = 'invalid_request_signature',
  SUSPICIOUS_REQUEST_PATTERN = 'suspicious_request_pattern',
  
  // Data Security
  SENSITIVE_DATA_ACCESS = 'sensitive_data_access',
  DATA_EXPORT_ATTEMPT = 'data_export_attempt',
  BULK_OPERATION_ATTEMPT = 'bulk_operation_attempt'
}

/**
 * Security Event Severity Levels
 */
export enum SecurityEventSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Security Event Interface
 */
export interface SecurityEvent {
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  success: boolean;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  sessionId?: string;
  details: Record<string, any>;
  metadata?: {
    requestId?: string;
    source?: string;
    riskScore?: number;
    tags?: string[];
  };
}

/**
 * Enhanced Security Event Logger
 * 
 * Logs security events with comprehensive context and threat analysis
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    const supabase = await createClient();
    const headersList = await headers();
    
    // Extract request context
    const requestContext = {
      ipAddress: event.ipAddress || getClientIP(headersList),
      userAgent: event.userAgent || headersList.get('user-agent') || '',
      referer: headersList.get('referer') || '',
      timestamp: new Date().toISOString()
    };

    // Calculate risk score
    const riskScore = calculateRiskScore(event, requestContext);
    
    // Prepare log entry
    const logEntry = {
      event_type: event.type,
      severity: event.severity,
      success: event.success,
      user_id: event.userId,
      email: event.email,
      ip_address: requestContext.ipAddress,
      user_agent: requestContext.userAgent,
      location: event.location,
      session_id: event.sessionId,
      details: {
        ...event.details,
        referer: requestContext.referer,
        risk_score: riskScore
      },
      metadata: {
        requestId: crypto.randomUUID(),
        source: 'auth_system',
        riskScore: riskScore,
        tags: generateEventTags(event),
        ...event.metadata
      },
      timestamp: requestContext.timestamp
    };

    // Store in security_events table
    await supabase.from('security_events').insert(logEntry);
    
    // If high risk, also trigger immediate analysis
    if (riskScore >= 70) {
      await triggerSecurityAnalysis(logEntry);
    }
    
  } catch (error) {
    // Log errors but don't block the authentication flow
    console.error('Error logging security event:', error);
    
    // Fallback to console logging for critical events
    if (event.severity === SecurityEventSeverity.CRITICAL) {
      console.warn('CRITICAL SECURITY EVENT:', JSON.stringify(event, null, 2));
    }
  }
}

/**
 * Convenient logging functions for common security events
 */
export async function logAuthenticationAttempt(
  success: boolean,
  email: string,
  details: Record<string, any> = {}
): Promise<void> {
  await logSecurityEvent({
    type: success ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILED,
    severity: success ? SecurityEventSeverity.LOW : SecurityEventSeverity.MEDIUM,
    success,
    email,
    details
  });
}

export async function logSuspiciousActivity(
  type: SecurityEventType,
  userId: string | undefined,
  details: Record<string, any>
): Promise<void> {
  await logSecurityEvent({
    type,
    severity: SecurityEventSeverity.HIGH,
    success: false,
    userId,
    details
  });
}

export async function logUnauthorizedAccess(
  resource: string,
  userId?: string,
  details: Record<string, any> = {}
): Promise<void> {
  await logSecurityEvent({
    type: SecurityEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
    severity: SecurityEventSeverity.HIGH,
    success: false,
    userId,
    details: {
      resource,
      ...details
    }
  });
}

export async function logSessionEvent(
  type: SecurityEventType,
  success: boolean,
  userId: string,
  sessionId?: string,
  details: Record<string, any> = {}
): Promise<void> {
  await logSecurityEvent({
    type,
    severity: success ? SecurityEventSeverity.LOW : SecurityEventSeverity.MEDIUM,
    success,
    userId,
    sessionId,
    details
  });
}

/**
 * Calculate risk score based on event and context
 */
function calculateRiskScore(event: SecurityEvent, context: any): number {
  let score = 0;
  
  // Base score by event type
  const eventTypeScores: Record<string, number> = {
    [SecurityEventType.LOGIN_FAILED]: 20,
    [SecurityEventType.LOGIN_RATE_LIMITED]: 40,
    [SecurityEventType.BRUTE_FORCE_DETECTED]: 90,
    [SecurityEventType.SESSION_HIJACK_ATTEMPT]: 95,
    [SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT]: 85,
    [SecurityEventType.CSRF_TOKEN_MISMATCH]: 60,
    [SecurityEventType.UNUSUAL_LOCATION_LOGIN]: 50
  };
  
  score += eventTypeScores[event.type] || 10;
  
  // Increase score for failed events
  if (!event.success) {
    score += 15;
  }
  
  // Increase score for suspicious user agents
  if (context.userAgent && isSuspiciousUserAgent(context.userAgent)) {
    score += 25;
  }
  
  // Check for repeated failures
  if (event.details.attemptCount && event.details.attemptCount > 3) {
    score += event.details.attemptCount * 10;
  }
  
  return Math.min(100, score);
}

/**
 * Generate event tags for categorization
 */
function generateEventTags(event: SecurityEvent): string[] {
  const tags: string[] = [];
  
  // Add category tags
  if (event.type.includes('login')) tags.push('authentication');
  if (event.type.includes('register')) tags.push('registration');
  if (event.type.includes('password')) tags.push('password');
  if (event.type.includes('session')) tags.push('session');
  
  // Add severity tags
  tags.push(`severity_${event.severity}`);
  
  // Add success/failure tags
  tags.push(event.success ? 'success' : 'failure');
  
  // Add risk level tags
  if (event.metadata?.riskScore) {
    if (event.metadata.riskScore >= 70) tags.push('high_risk');
    else if (event.metadata.riskScore >= 40) tags.push('medium_risk');
    else tags.push('low_risk');
  }
  
  return tags;
}

/**
 * Extract client IP from headers
 */
function getClientIP(headersList: Headers): string {
  // Try various headers that might contain the real IP
  const possibleHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip', // Cloudflare
    'x-cluster-client-ip'
  ];
  
  for (const header of possibleHeaders) {
    const value = headersList.get(header);
    if (value) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      return value.split(',')[0].trim();
    }
  }
  
  return 'unknown';
}

/**
 * Check if user agent appears suspicious
 */
function isSuspiciousUserAgent(userAgent: string): boolean {
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scan/i,
    /curl/i,
    /wget/i,
    /python/i,
    /postman/i
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Trigger immediate security analysis for high-risk events
 */
async function triggerSecurityAnalysis(logEntry: any): Promise<void> {
  try {
    // In a production environment, this would trigger:
    // 1. Real-time alerting to security team
    // 2. Automatic threat response (e.g., temporary account lock)
    // 3. Enhanced monitoring for the user/IP
    // 4. Integration with SIEM systems
    
    console.warn('HIGH RISK SECURITY EVENT DETECTED:', {
      type: logEntry.event_type,
      riskScore: logEntry.details.risk_score,
      userId: logEntry.user_id,
      ipAddress: logEntry.ip_address,
      timestamp: logEntry.timestamp
    });
    
    // Could also send to external monitoring service
    // await sendToSecurityService(logEntry);
    
  } catch (error) {
    console.error('Failed to trigger security analysis:', error);
  }
}

/**
 * Get security event statistics for dashboard
 */
export async function getSecurityEventStats(
  timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'
): Promise<{
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  failureRate: number;
  topRiskEvents: any[];
}> {
  try {
    const supabase = await createClient();
    
    // Calculate time window
    const now = new Date();
    const timeWindow = new Date();
    
    switch (timeframe) {
      case 'hour':
        timeWindow.setHours(timeWindow.getHours() - 1);
        break;
      case 'day':
        timeWindow.setDate(timeWindow.getDate() - 1);
        break;
      case 'week':
        timeWindow.setDate(timeWindow.getDate() - 7);
        break;
      case 'month':
        timeWindow.setMonth(timeWindow.getMonth() - 1);
        break;
    }
    
    const { data: events, error } = await supabase
      .from('security_events')
      .select('*')
      .gte('timestamp', timeWindow.toISOString())
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    
    // Calculate statistics
    const total = events.length;
    const failures = events.filter(e => !e.success).length;
    const failureRate = total > 0 ? (failures / total) * 100 : 0;
    
    // Group by type
    const byType = events.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Group by severity
    const bySeverity = events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Get top risk events
    const topRiskEvents = events
      .filter(e => e.details?.risk_score >= 50)
      .sort((a, b) => (b.details.risk_score || 0) - (a.details.risk_score || 0))
      .slice(0, 10);
    
    return {
      total,
      byType,
      bySeverity,
      failureRate,
      topRiskEvents
    };
    
  } catch (error) {
    console.error('Error getting security stats:', error);
    return {
      total: 0,
      byType: {},
      bySeverity: {},
      failureRate: 0,
      topRiskEvents: []
    };
  }
}