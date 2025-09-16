-- Authentication Security Database Schema
-- This script creates the necessary tables for authentication security features
-- including rate limiting, security event logging, and audit trails.

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rate Limiting Table
-- Stores rate limiting counters for various authentication actions
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) NOT NULL UNIQUE, -- Rate limit key (e.g., "login:user@example.com")
    attempts INTEGER NOT NULL DEFAULT 0, -- Number of attempts in current window
    last_attempt BIGINT NOT NULL, -- Unix timestamp of last attempt
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for efficient rate limit lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_last_attempt ON rate_limits(last_attempt);

-- Security Events Table (Enhanced)
-- Comprehensive security event logging with threat analysis
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL, -- Type of security event
    severity VARCHAR(20) NOT NULL DEFAULT 'low', -- low, medium, high, critical
    success BOOLEAN NOT NULL, -- Whether the event was successful
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- User involved (if any)
    email VARCHAR(255), -- Email address involved
    ip_address INET, -- Client IP address
    user_agent TEXT, -- User agent string
    location VARCHAR(255), -- Geographic location (if available)
    session_id VARCHAR(255), -- Session identifier
    details JSONB DEFAULT '{}', -- Event-specific details
    metadata JSONB DEFAULT '{}', -- Additional metadata (risk score, tags, etc.)
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient security event queries
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_ip_address ON security_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_success ON security_events(success);

-- GIN index for JSONB fields
CREATE INDEX IF NOT EXISTS idx_security_events_details ON security_events USING GIN(details);
CREATE INDEX IF NOT EXISTS idx_security_events_metadata ON security_events USING GIN(metadata);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_security_events_user_time ON security_events(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_ip_time ON security_events(ip_address, timestamp);

-- Auth Logs Table (Backward Compatibility)
-- Simplified authentication logging for basic audit trail
CREATE TABLE IF NOT EXISTS auth_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    success BOOLEAN NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    details JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for auth logs
CREATE INDEX IF NOT EXISTS idx_auth_logs_type ON auth_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_timestamp ON auth_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_auth_logs_ip_address ON auth_logs(ip_address);

-- Session Tracking Table
-- Track user sessions for security monitoring
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for session tracking
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Security Alerts Table
-- Store security alerts for admin review
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    affected_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    source_ip INET,
    status VARCHAR(50) DEFAULT 'open', -- open, investigating, resolved, false_positive
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for security alerts
CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_security_alerts_user ON security_alerts(affected_user_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created ON security_alerts(created_at);

-- Audit Trail Table
-- Comprehensive audit trail for all sensitive operations
CREATE TABLE IF NOT EXISTS audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    action VARCHAR(50) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit trail
CREATE INDEX IF NOT EXISTS idx_audit_trail_table ON audit_trail(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_trail_record ON audit_trail(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action ON audit_trail(action);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user ON audit_trail(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON audit_trail(timestamp);

-- Row Level Security (RLS) Policies
-- Ensure users can only access their own data

-- Enable RLS on all security tables
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Rate limits: No direct user access (server-side only)
CREATE POLICY "rate_limits_server_only" ON rate_limits
    FOR ALL USING (false);

-- Security events: Admins can read all, users can read their own
CREATE POLICY "security_events_admin_read" ON security_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "security_events_user_read" ON security_events
    FOR SELECT USING (user_id = auth.uid());

-- Auth logs: Similar to security events
CREATE POLICY "auth_logs_admin_read" ON auth_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "auth_logs_user_read" ON auth_logs
    FOR SELECT USING (user_id = auth.uid());

-- User sessions: Users can read their own sessions
CREATE POLICY "user_sessions_own_read" ON user_sessions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_sessions_own_update" ON user_sessions
    FOR UPDATE USING (user_id = auth.uid());

-- Security alerts: Admin only
CREATE POLICY "security_alerts_admin_only" ON security_alerts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' = 'admin'
        )
    );

-- Audit trail: Admin read-only
CREATE POLICY "audit_trail_admin_read" ON audit_trail
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' = 'admin'
        )
    );

-- Functions for automated cleanup

-- Function to clean up expired rate limits
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS void AS $$
BEGIN
    -- Remove rate limit entries older than 24 hours
    DELETE FROM rate_limits 
    WHERE last_attempt < EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours');
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old security events (keep for 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_security_events()
RETURNS void AS $$
BEGIN
    -- Archive old events to separate table if needed, then delete
    DELETE FROM security_events 
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    DELETE FROM auth_logs 
    WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Function to detect suspicious patterns
CREATE OR REPLACE FUNCTION detect_suspicious_activity()
RETURNS void AS $$
BEGIN
    -- Example: Detect multiple failed logins from same IP
    INSERT INTO security_alerts (alert_type, severity, title, description, source_ip, metadata)
    SELECT 
        'multiple_failed_logins',
        'high',
        'Multiple Failed Login Attempts',
        'Multiple failed login attempts detected from IP: ' || ip_address,
        ip_address,
        jsonb_build_object(
            'failed_count', failed_count,
            'time_window', '1 hour'
        )
    FROM (
        SELECT 
            ip_address,
            COUNT(*) as failed_count
        FROM security_events 
        WHERE event_type = 'login_failed' 
            AND timestamp > NOW() - INTERVAL '1 hour'
            AND ip_address IS NOT NULL
        GROUP BY ip_address
        HAVING COUNT(*) >= 5
    ) suspicious_ips
    WHERE NOT EXISTS (
        SELECT 1 FROM security_alerts 
        WHERE alert_type = 'multiple_failed_logins' 
            AND source_ip = suspicious_ips.ip_address
            AND status = 'open'
            AND created_at > NOW() - INTERVAL '1 hour'
    );
END;
$$ LANGUAGE plpgsql;

-- Triggers for audit trail
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_trail (table_name, record_id, action, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_trail (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_trail (table_name, record_id, action, old_values, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for important tables (uncomment as needed)
-- CREATE TRIGGER audit_users_trigger
--     AFTER INSERT OR UPDATE OR DELETE ON auth.users
--     FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Schedule cleanup functions (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-rate-limits', '0 */6 * * *', 'SELECT cleanup_expired_rate_limits();');
-- SELECT cron.schedule('cleanup-security-events', '0 2 * * *', 'SELECT cleanup_old_security_events();');
-- SELECT cron.schedule('detect-suspicious-activity', '*/15 * * * *', 'SELECT detect_suspicious_activity();');

-- Grant necessary permissions
-- GRANT USAGE ON SCHEMA public TO authenticated;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE rate_limits IS 'Rate limiting counters for authentication actions';
COMMENT ON TABLE security_events IS 'Comprehensive security event logging with threat analysis';
COMMENT ON TABLE auth_logs IS 'Basic authentication audit trail for compatibility';
COMMENT ON TABLE user_sessions IS 'Active user session tracking for security monitoring';
COMMENT ON TABLE security_alerts IS 'Security alerts requiring admin attention';
COMMENT ON TABLE audit_trail IS 'Comprehensive audit trail for all sensitive operations';

COMMENT ON COLUMN security_events.details IS 'Event-specific details in JSON format';
COMMENT ON COLUMN security_events.metadata IS 'Additional metadata including risk scores and tags';
COMMENT ON COLUMN security_alerts.status IS 'Alert status: open, investigating, resolved, false_positive';