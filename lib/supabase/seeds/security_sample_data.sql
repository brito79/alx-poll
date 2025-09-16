-- Sample Security Data for Testing
-- This file contains sample security events and rate limits for testing the authentication system

-- Sample security events
INSERT INTO public.security_events (
    event_type, 
    severity, 
    success, 
    email, 
    ip_address, 
    user_agent,
    details,
    metadata,
    timestamp
) VALUES
(
    'login_success',
    'low',
    true,
    'test@example.com',
    '192.168.1.100',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    '{"login_method": "password", "device": "desktop"}',
    '{"risk_score": 5, "tags": ["authentication", "success", "low_risk"]}',
    NOW() - INTERVAL '1 hour'
),
(
    'login_failed',
    'medium',
    false,
    'test@example.com',
    '192.168.1.100',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    '{"error": "invalid_credentials", "attempt_number": 1}',
    '{"risk_score": 25, "tags": ["authentication", "failure", "medium_risk"]}',
    NOW() - INTERVAL '30 minutes'
),
(
    'register_success',
    'low',
    true,
    'newuser@example.com',
    '192.168.1.101',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    '{"registration_method": "email", "verification_required": true}',
    '{"risk_score": 10, "tags": ["registration", "success", "low_risk"]}',
    NOW() - INTERVAL '2 hours'
),
(
    'password_reset_requested',
    'low',
    true,
    'test@example.com',
    '192.168.1.100',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
    '{"reset_method": "email"}',
    '{"risk_score": 15, "tags": ["password", "reset", "low_risk"]}',
    NOW() - INTERVAL '3 hours'
),
(
    'login_rate_limited',
    'high',
    false,
    'attacker@suspicious.com',
    '10.0.0.1',
    'curl/7.68.0',
    '{"attempts": 5, "time_window": "5_minutes"}',
    '{"risk_score": 85, "tags": ["authentication", "rate_limited", "high_risk", "suspicious"]}',
    NOW() - INTERVAL '4 hours'
);

-- Sample rate limits
INSERT INTO public.rate_limits (key, attempts, last_attempt) VALUES
('login:test@example.com', 1, EXTRACT(EPOCH FROM NOW() - INTERVAL '10 minutes')),
('register:newuser@example.com', 1, EXTRACT(EPOCH FROM NOW() - INTERVAL '2 hours')),
('reset:test@example.com', 1, EXTRACT(EPOCH FROM NOW() - INTERVAL '3 hours')),
('login:attacker@suspicious.com', 5, EXTRACT(EPOCH FROM NOW() - INTERVAL '4 hours'));

-- Sample auth logs for backward compatibility
INSERT INTO public.auth_logs (
    event_type,
    success,
    email,
    ip_address,
    user_agent,
    details,
    timestamp
) VALUES
(
    'login_attempt',
    true,
    'test@example.com',
    '192.168.1.100',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    '{"method": "password"}',
    NOW() - INTERVAL '1 hour'
),
(
    'logout',
    true,
    'test@example.com',
    '192.168.1.100',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    '{"session_duration": "45_minutes"}',
    NOW() - INTERVAL '15 minutes'
);

-- Add comments
COMMENT ON TABLE public.rate_limits IS 'Stores rate limiting data for authentication actions';
COMMENT ON TABLE public.security_events IS 'Comprehensive security event logging with threat analysis';
COMMENT ON TABLE public.auth_logs IS 'Basic authentication logging for audit purposes';