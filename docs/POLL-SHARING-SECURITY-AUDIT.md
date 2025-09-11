# Poll Sharing Security Audit

## Overview

This document outlines the security audit performed on the poll sharing functionality of ALX-Polly. The audit focused on identifying vulnerabilities in the sharing mechanisms, access controls, and potential data exposure risks.

## Components Audited

- `app/(dashboard)/polls/vulnerable-share.tsx`
- `app/(dashboard)/polls/PollActions.tsx`
- `app/lib/utils/share-security.ts`
- `app/lib/actions/poll-actions.ts` (sharing-related functions)
- Sharing URL generation and validation logic

## Vulnerabilities Identified

### 1. Insecure Sharing Link Generation

**Severity**: High

**Description**: The original sharing mechanism used predictable IDs in URLs, making it possible to guess valid sharing links.

**Impact**: Unauthorized users could potentially access polls that were meant to be private by guessing or incrementing IDs.

**Fix Implemented**: Replaced simple IDs with secure tokens for shared polls:

```typescript
// Before
const shareUrl = `${window.location.origin}/polls/${poll.id}`;

// After
export async function generateSecureShareLink(pollId: string, userId: string): Promise<string> {
  // Generate a cryptographically secure random token
  const shareToken = crypto.randomUUID();
  
  // Store the token with the poll ID and an expiration date
  await storeShareToken(shareToken, pollId, userId);
  
  // Return the secure share URL
  return `${process.env.NEXT_PUBLIC_BASE_URL}/share/${shareToken}`;
}
```

### 2. Missing Access Controls for Shared Polls

**Severity**: Critical

**Description**: Once a poll was shared, there were insufficient controls to verify whether the access was authorized.

**Impact**: Anyone with a link could access shared polls indefinitely, even if sharing was later disabled.

**Fix Implemented**: Added token validation with proper expiration and revocation capabilities:

```typescript
export async function validateShareToken(token: string): Promise<{ 
  valid: boolean; 
  pollId?: string; 
  error?: string;
}> {
  try {
    // Look up the token in the database
    const supabase = createClient();
    const { data, error } = await supabase
      .from("share_tokens")
      .select("poll_id, expires_at, is_revoked")
      .eq("token", token)
      .single();
    
    if (error || !data) {
      return { valid: false, error: "Invalid share link" };
    }
    
    // Check if token is revoked
    if (data.is_revoked) {
      return { valid: false, error: "This share link has been revoked" };
    }
    
    // Check if token is expired
    if (new Date(data.expires_at) < new Date()) {
      return { valid: false, error: "This share link has expired" };
    }
    
    // Token is valid
    return { valid: true, pollId: data.poll_id };
  } catch (err) {
    console.error("Error validating share token:", err);
    return { valid: false, error: "Error validating share link" };
  }
}
```

### 3. XSS Vulnerability in Share Feature

**Severity**: High

**Description**: The share dialog didn't properly sanitize poll information when displaying share links.

**Impact**: Potential for stored XSS attacks if a poll was created with malicious content.

**Fix Implemented**: Added proper sanitization of shared content:

```typescript
// Before
<div dangerouslySetInnerHTML={{ __html: `Share "${poll.question}"` }} />

// After
<div>Share "{sanitizeText(poll.question)}"</div>
```

### 4. Lack of Rate Limiting on Share Feature

**Severity**: Medium

**Description**: No rate limiting was applied to share link generation, allowing potential abuse.

**Impact**: Attackers could generate large numbers of share tokens, causing database bloat and potential DoS.

**Fix Implemented**: Added rate limiting to share link generation:

```typescript
export async function generateShareLink(pollId: string, userId: string): Promise<{ 
  url?: string; 
  error?: string; 
}> {
  try {
    // Apply rate limiting
    const rateLimited = await checkRateLimit(`share_${userId}`, "generate_share_link", 10);
    
    if (rateLimited) {
      await logSecurityEvent("share_rate_limited", false, {
        userId,
        pollId,
        details: "Rate limit exceeded for share link generation"
      });
      return { error: "You've generated too many share links. Please try again later." };
    }
    
    // Generate the share link
    const url = await generateSecureShareLink(pollId, userId);
    return { url };
  } catch (err) {
    console.error("Error generating share link:", err);
    return { error: "Failed to generate share link" };
  }
}
```

### 5. Insufficient Logging of Share Access

**Severity**: Medium

**Description**: Access to shared polls wasn't properly logged, making it difficult to detect misuse.

**Impact**: Poll owners had no visibility into who accessed their polls via shared links.

**Fix Implemented**: Added comprehensive logging of share link usage:

```typescript
export async function logShareAccess(
  shareToken: string,
  pollId: string,
  accessedBy?: string
): Promise<void> {
  try {
    // Record the access in the database
    const supabase = createClient();
    await supabase.from("share_access_logs").insert({
      share_token: shareToken,
      poll_id: pollId,
      accessed_by: accessedBy || null,
      ip_address: hashIpAddress(getRequestIp()), // Hashed for privacy
      user_agent: getUserAgent(),
      accessed_at: new Date().toISOString()
    });
  } catch (err) {
    // Log error but don't block access if logging fails
    console.error("Failed to log share access:", err);
  }
}
```

## Recommendations

1. **Share Token Expiration**: Implement automatic expiration of share tokens after a configurable time period.

2. **Access Controls for Viewers**: Add optional authentication requirement for viewing shared polls.

3. **Share Analytics**: Provide poll owners with anonymized analytics on shared poll access.

4. **One-time Use Links**: Implement single-use share links for highly sensitive polls.

5. **Watermarking**: Add visual watermarks to shared polls to indicate their source.

6. **Link Revocation**: Allow users to easily revoke previously shared links.

## Conclusion

The poll sharing functionality has been significantly improved from a security perspective. The implementation of secure tokens, proper access controls, rate limiting, and comprehensive logging has addressed the major vulnerabilities identified during the audit. Continued monitoring and regular security reviews are recommended to ensure the sharing functionality remains secure as the application evolves.
