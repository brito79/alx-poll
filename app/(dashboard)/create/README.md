# Poll Creation Module - Developer Guide

## Overview

This module handles the creation of new polls in the ALX-Polly application. The implementation follows security best practices to prevent common web vulnerabilities such as XSS, CSRF, and injection attacks.

## Files

- `page.tsx` - Server component that renders the poll creation page
- `PollCreateForm.tsx` - Client component that handles the form UI and submission

## Security Implementation

This module implements a robust security model:

1. **Server-side Authentication** - All access to the poll creation page is protected by server-side authentication checks
2. **CSRF Protection** - Form submissions are protected by CSRF tokens
3. **Input Sanitization** - All user inputs are sanitized to prevent XSS attacks
4. **Comprehensive Validation** - Multiple validation layers prevent malformed data
5. **Rate Limiting** - UI controls prevent rapid submissions
6. **Error Handling** - Secure error handling prevents information disclosure

## Developer Guidelines

### Adding New Fields

When adding new fields to the poll creation form:

1. Add appropriate state variables:
   ```typescript
   const [newField, setNewField] = useState<string>("");
   ```

2. Implement sanitization in the change handler:
   ```typescript
   const handleNewFieldChange = (value: string) => {
     const sanitized = sanitizeText(value).slice(0, MAX_LENGTH);
     setNewField(sanitized);
   };
   ```

3. Add validation rules to the `validateForm` function:
   ```typescript
   if (!newField || newField.trim().length === 0) {
     setError("New field is required");
     return false;
   }
   ```

4. Include sanitization in form submission:
   ```typescript
   secureFormData.set("newField", sanitizeText(newField));
   ```

### Security Testing

Before submitting a PR that modifies this module, verify:

1. CSRF protection works correctly
2. Input sanitization prevents XSS attacks
3. All validation rules function properly
4. UI state management prevents multiple submissions
5. Error handling works correctly

### Constants and Limitations

This module enforces the following limitations:

- `MAX_QUESTION_LENGTH = 500` - Maximum length for poll questions
- `MAX_OPTION_LENGTH = 200` - Maximum length for each poll option
- `MIN_OPTIONS = 2` - Minimum number of options required
- `MAX_OPTIONS = 10` - Maximum number of options allowed

These constants are defined for both security and usability reasons. Do not modify them without consulting with security team.

## API Integration

The form interacts with the server through the `createPoll` action in `app/lib/actions/poll-actions.ts`. This function:

1. Receives form data from the client
2. Performs additional server-side validation and sanitization
3. Rate-limits based on user ID
4. Logs security events
5. Returns success/error response to the client

## Example Security Patterns

### CSRF Protection Pattern

```typescript
// 1. Generate token on component mount
useEffect(() => {
  const token = generateCSRFToken();
  setCsrfToken(token);
  sessionStorage.setItem("pollCreateCsrfToken", token);
}, []);

// 2. Include hidden token field
<input type="hidden" name="csrfToken" value={csrfToken} />

// 3. Validate token on submission
const submittedToken = formData.get("csrfToken") as string;
const storedToken = sessionStorage.getItem("pollCreateCsrfToken") || "";
      
if (!validateCSRFToken(submittedToken, storedToken)) {
  setError("Security verification failed. Please refresh the page.");
  return;
}
```

### Sanitization Pattern

```typescript
// 1. Sanitize on input
const handleChange = (value: string) => {
  const sanitized = sanitizeText(value).slice(0, MAX_LENGTH);
  setValue(sanitized);
};

// 2. Sanitize again before submission
secureFormData.set("field", sanitizeText(value));
```

## Security Documentation

For more detailed information about the security implementation, refer to:

- [SECURITY-IMPLEMENTATIONS.md](./SECURITY-IMPLEMENTATIONS.md) - General security principles
- [POLL-CREATION-SECURITY.md](./POLL-CREATION-SECURITY.md) - Detailed poll creation security docs
