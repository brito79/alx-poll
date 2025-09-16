# Authentication System Testing Guide

This guide provides comprehensive testing procedures for the ALX-Polly authentication system. Follow these tests to verify that all security features are working correctly.

## Prerequisites

1. Database tables are created (run migration: `20241216000001_auth_security_tables.sql`)
2. Environment variables are properly configured
3. Supabase project is set up with authentication enabled

## Test Categories

### 1. User Registration Tests

#### Test 1.1: Successful Registration
```
Action: Register with valid data
Email: test-user@example.com
Password: SecurePass123!
Username: testuser

Expected Results:
✓ Registration succeeds
✓ Password strength indicator shows "Strong"
✓ Email verification email is sent
✓ Security event logged: register_success
✓ User redirected to login with success message
```

#### Test 1.2: Password Validation
```
Test weak passwords:
- "password" → Should show "too common" error
- "12345678" → Should show "missing requirements" error  
- "Password" → Should show "missing number and special char"
- "password1" → Should show "missing uppercase and special char"

Expected Results:
✓ Real-time password strength feedback
✓ Registration blocked for weak passwords
✓ Clear validation messages displayed
```

#### Test 1.3: Email Validation
```
Test invalid emails:
- "invalid-email" → Should show email format error
- "user@" → Should show email format error
- "" → Should show required field error

Expected Results:
✓ Client-side validation prevents submission
✓ Clear error messages shown
```

#### Test 1.4: Rate Limiting
```
Action: Attempt registration 4+ times with same email
Expected Results:
✓ After 3 attempts, rate limiting kicks in
✓ "Too many attempts" error shown
✓ Security event logged: register_rate_limited
✓ User must wait before trying again
```

### 2. User Login Tests

#### Test 2.1: Successful Login
```
Action: Login with valid credentials
Email: test-user@example.com
Password: SecurePass123!

Expected Results:
✓ Login succeeds
✓ User redirected to dashboard
✓ Session indicator shows active status
✓ Security event logged: login_success
✓ Rate limit counter reset
```

#### Test 2.2: Failed Login
```
Action: Login with invalid password
Email: test-user@example.com
Password: WrongPassword123!

Expected Results:
✓ Login fails with generic error message
✓ Security event logged: login_failed
✓ Rate limit counter incremented
✓ Remaining attempts shown
```

#### Test 2.3: Account Lockout
```
Action: 5+ failed login attempts
Expected Results:
✓ After 5 attempts, account temporarily locked
✓ "Too many attempts" error shown
✓ Security event logged: login_rate_limited
✓ User must wait before trying again
```

#### Test 2.4: Remember Me Functionality
```
Action: Login with "Remember Me" checked
Expected Results:
✓ Session persists after browser close
✓ Session indicator shows longer expiry time
✓ User remains logged in on return
```

### 3. Session Management Tests

#### Test 3.1: Session Refresh
```
Action: Wait for automatic session refresh (10 minutes)
Expected Results:
✓ Session refreshes automatically
✓ Session indicator updates timestamp
✓ User remains authenticated
✓ No interruption to user experience
```

#### Test 3.2: Session Expiry Warning
```
Action: Wait until 5 minutes before session expiry
Expected Results:
✓ Warning toast appears
✓ Session indicator turns orange/red
✓ "Session expiring soon" message shown
```

#### Test 3.3: Session Expiry
```
Action: Allow session to expire completely
Expected Results:
✓ User automatically signed out
✓ Redirected to login page
✓ "Session expired" message shown
✓ Security event logged: session_expired
```

#### Test 3.4: Manual Session Refresh
```
Action: Click "Refresh" button in session indicator
Expected Results:
✓ Session refreshed immediately
✓ Success message shown
✓ Session timer resets
```

### 4. Password Reset Tests

#### Test 4.1: Request Password Reset
```
Action: Use "Forgot Password" with valid email
Email: test-user@example.com

Expected Results:
✓ Reset email sent
✓ Success message shown
✓ Security event logged: password_reset_requested
✓ User redirected appropriately
```

#### Test 4.2: Invalid Email Reset Request
```
Action: Request reset with non-existent email
Expected Results:
✓ Generic success message (no information disclosure)
✓ No email sent
✓ Security event logged: reset_failed
```

#### Test 4.3: Reset Rate Limiting
```
Action: Request password reset 4+ times
Expected Results:
✓ After 3 attempts, rate limited
✓ "Too many attempts" error shown
✓ Security event logged: reset_rate_limited
```

#### Test 4.4: Password Reset Completion
```
Action: Use valid reset link to change password
New Password: NewSecurePass456!

Expected Results:
✓ Password successfully changed
✓ User can login with new password
✓ Old password no longer works
✓ Security event logged: password_reset_success
```

#### Test 4.5: Invalid Reset Token
```
Action: Use expired or invalid reset token
Expected Results:
✓ Error message about invalid/expired token
✓ User redirected to request new reset
✓ Security event logged: password_reset_token_invalid
```

### 5. Security Event Logging Tests

#### Test 5.1: Event Creation
```
Action: Perform various auth operations
Expected Results:
✓ All operations logged to security_events table
✓ Correct event types recorded
✓ Risk scores calculated appropriately
✓ IP addresses and user agents captured
```

#### Test 5.2: Suspicious Activity Detection
```
Action: Multiple failed logins from same IP
Expected Results:
✓ Risk score increases with attempts
✓ High-risk events trigger alerts
✓ Suspicious patterns detected
```

#### Test 5.3: Log Data Integrity
```
Expected Results:
✓ Sensitive data not logged (passwords, tokens)
✓ Personal information handled according to privacy policy
✓ Log entries are immutable once created
```

### 6. Error Handling Tests

#### Test 6.1: Network Errors
```
Action: Simulate network connectivity issues
Expected Results:
✓ Graceful error handling
✓ User-friendly error messages
✓ Retry mechanisms where appropriate
✓ No sensitive information disclosed
```

#### Test 6.2: Server Errors
```
Action: Simulate server downtime/errors
Expected Results:
✓ Appropriate error messages
✓ Fallback mechanisms activated
✓ User experience preserved
```

#### Test 6.3: Invalid Input Handling
```
Action: Submit malformed or malicious input
Expected Results:
✓ Input validation prevents issues
✓ No system errors exposed to user
✓ Security events logged for suspicious input
```

### 7. Security Feature Tests

#### Test 7.1: CSRF Protection
```
Action: Submit forms without valid CSRF tokens
Expected Results:
✓ Requests rejected
✓ Security events logged
✓ No unauthorized actions performed
```

#### Test 7.2: Rate Limiting Bypass Attempts
```
Action: Try to bypass rate limits (IP rotation, etc.)
Expected Results:
✓ Rate limits enforced
✓ Bypass attempts detected and logged
✓ Additional security measures triggered
```

#### Test 7.3: Session Security
```
Action: Test session fixation and hijacking scenarios
Expected Results:
✓ Session tokens properly randomized
✓ Session validation working correctly
✓ Suspicious session activity detected
```

## Test Execution Checklist

### Manual Testing Checklist
- [ ] Registration flow (Tests 1.1-1.4)
- [ ] Login flow (Tests 2.1-2.4)
- [ ] Session management (Tests 3.1-3.4)
- [ ] Password reset (Tests 4.1-4.5)
- [ ] Security logging (Tests 5.1-5.3)
- [ ] Error handling (Tests 6.1-6.3)
- [ ] Security features (Tests 7.1-7.3)

### Database Verification Checklist
After testing, verify in database:
- [ ] `security_events` table has appropriate entries
- [ ] `rate_limits` table shows rate limiting data
- [ ] `auth_logs` table contains audit trail
- [ ] Risk scores are calculated correctly
- [ ] Event types are categorized properly

### Performance Testing
- [ ] Login performance under normal load
- [ ] Rate limiting effectiveness under high load
- [ ] Database query performance for security events
- [ ] Session refresh performance

## Common Issues and Solutions

### Issue: Password strength indicator not updating
**Solution**: Check React state updates and event handlers

### Issue: Rate limiting not working
**Solution**: Verify database connection and table structure

### Issue: Session refresh failing
**Solution**: Check Supabase client configuration and token handling

### Issue: Security events not logging
**Solution**: Verify database permissions and error handling

## Security Validation

### Authentication Security Checklist
- [ ] Passwords are hashed and never stored in plain text
- [ ] Rate limiting prevents brute force attacks
- [ ] Session tokens are secure and properly managed
- [ ] CSRF protection is enabled and working
- [ ] Input validation prevents injection attacks
- [ ] Error messages don't leak sensitive information
- [ ] Security events are logged appropriately
- [ ] User data is protected according to privacy requirements

### Data Protection Checklist
- [ ] Personal data is minimized in logs
- [ ] IP addresses are handled according to privacy policy
- [ ] Audit trail maintains data integrity
- [ ] User consent is obtained where required
- [ ] Data retention policies are enforced

## Test Environment Setup

1. **Development Environment**
   ```bash
   # Set up test database
   supabase migration up
   
   # Load test data
   supabase db seed security_sample_data
   
   # Start development server
   npm run dev
   ```

2. **Test User Accounts**
   - Create dedicated test accounts
   - Use disposable email addresses
   - Document test credentials securely

3. **Monitoring Setup**
   - Enable logging in development
   - Set up test alerts
   - Configure test security thresholds

## Reporting

After completing tests, document:
1. All test results (pass/fail)
2. Any security issues discovered
3. Performance metrics
4. Recommendations for improvements
5. Next testing cycle schedule

Remember: Security testing should be performed regularly, especially after any changes to the authentication system.