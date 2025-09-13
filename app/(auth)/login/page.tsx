'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { login } from '@/app/lib/actions/auth-actions';
// For security indicator
import { Lock } from 'lucide-react';

// Import auth security utilities
import { 
  generateCsrfToken, 
  storeCsrfToken, 
  validateCsrfToken,
  mapAuthErrorToUserMessage,
  shouldAllowSubmit
} from '@/app/lib/utils/auth-security';

/**
 * LoginPage Component
 * 
 * Serves as the primary authentication entry point for the application.
 * This component is critical to the application's security model as it:
 * 1. Provides the user interface for existing users to authenticate
 * 2. Implements multiple security measures against common authentication attacks
 * 3. Acts as a gateway to the protected areas of the application
 * 
 * Used in: The authentication flow when users visit /login directly or are
 * redirected from protected routes that require authentication.
 * 
 * Security features:
 * - CSRF protection to prevent cross-site request forgery
 * - Rate limiting to prevent brute force attacks
 * - Attempt counting for progressive security hardening
 * - Secure error handling that doesn't leak sensitive information
 */
export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [lastSubmitTime, setLastSubmitTime] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  
  /**
   * CSRF Protection Initialization
   * 
   * Generates and stores a CSRF token when the component mounts.
   * Critical for preventing cross-site request forgery attacks by ensuring
   * that form submissions originated from our application.
   * 
   * This effect runs only once at component initialization, establishing
   * the security context for the login form's lifecycle.
   */
  useEffect(() => {
    const token = generateCsrfToken();
    setCsrfToken(token);
    storeCsrfToken(token);
  }, []);

  /**
   * Form Submission Handler
   * 
   * Processes login form submissions with comprehensive security measures.
   * This function is the central authentication control point that:
   * 1. Implements client-side rate limiting to prevent brute force attacks
   * 2. Enforces progressive security hardening with attempt counting
   * 3. Validates CSRF tokens to prevent cross-site request forgery
   * 4. Interfaces with the server-side authentication system
   * 5. Manages the UI state during the authentication flow
   * 
   * Used directly by the login form's onSubmit event, this handler coordinates
   * the entire authentication process and determines the subsequent user experience.
   * 
   * @param {React.FormEvent<HTMLFormElement>} event - The form submission event
   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Check for rapid submissions (anti-brute force)
    if (!shouldAllowSubmit(lastSubmitTime)) {
      setError('Please wait before trying again');
      return;
    }
    setLastSubmitTime(Date.now());
    
    // Track submission attempts for client-side throttling
    const newAttemptCount = attemptCount + 1;
    setAttemptCount(newAttemptCount);
    
    // Soft lockout after multiple attempts
    const maxAttempts = 5;
    if (newAttemptCount > maxAttempts) {
      setError('Too many attempts. Please try again later');
      return;
    }
    
    // Update UI state for authentication in progress
    setLoading(true);
    setError(null);

    // Extract and validate form data
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const submittedCsrfToken = formData.get('csrfToken') as string;
    
    /**
     * CSRF Token Validation
     * 
     * Protects against cross-site request forgery by verifying that the form
     * submission originated from our application. This is a critical security
     * check that prevents attackers from tricking authenticated users into
     * performing unwanted actions.
     */
    if (!validateCsrfToken(submittedCsrfToken)) {
      setError('Security verification failed. Please refresh the page');
      setLoading(false);
      return;
    }

    /**
     * Authentication Attempt and Response Handling
     * 
     * Communicates with the server-side authentication system and processes
     * the response appropriately. This try/catch block:
     * 1. Makes the actual authentication request to the server
     * 2. Handles success by redirecting to the application's main area
     * 3. Processes errors safely without exposing sensitive information
     * 4. Manages unexpected errors to maintain a stable user experience
     */
    try {
      const result = await login({ email, password });

      if (result?.error) {
        // Map error to user-friendly message without exposing sensitive details
        setError(mapAuthErrorToUserMessage(result.error));
        setLoading(false);
      } else {
        // Reset attempt counter on successful authentication
        setAttemptCount(0);
        // Use router for secure navigation to the application's main area
        router.push('/polls');
      }
    } catch (err) {
      // Handle unexpected errors gracefully without exposing system details
      setError('Connection error. Please try again');
      setLoading(false);
    }
  };

  /**
   * Component Rendering
   * 
   * Renders the login interface with accessibility and security considerations.
   * This UI implementation:
   * 1. Presents a clean, focused authentication form
   * 2. Includes visual security indicators to build user trust
   * 3. Provides clear feedback for error states
   * 4. Maintains accessibility best practices
   * 5. Offers navigation paths to registration and password recovery
   * 
   * The rendered form connects directly to the handleSubmit function,
   * completing the authentication user experience flow.
   */
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center gap-2">
            <Lock size={20} className="text-green-600" />
            <CardTitle className="text-2xl font-bold text-center">Login to ALX Polly</CardTitle>
          </div>
          <CardDescription className="text-center">Enter your credentials to access your account</CardDescription>
          
          {/* Security indicator */}
          <div className="mt-2 flex items-center justify-center">
            <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
              <Lock size={12} className="mr-1" />
              Secure Connection
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Hidden CSRF token */}
            <input type="hidden" name="csrfToken" value={csrfToken} />
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                name="email"
                type="email" 
                placeholder="your@email.com" 
                required
                autoComplete="email"
                autoCapitalize="none"
                spellCheck="false"
                aria-invalid={error ? "true" : "false"}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input 
                id="password" 
                name="password"
                type="password" 
                required
                autoComplete="current-password"
                aria-invalid={error ? "true" : "false"}
              />
            </div>
            
            {/* Error display with improved accessibility */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-sm" role="alert">
                {error}
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || attemptCount > 5}
              aria-busy={loading}
            >
              {loading ? 'Authenticating...' : 'Login'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 items-center">
          <p className="text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-blue-600 hover:underline">
              Register
            </Link>
          </p>
          
          {/* Security reminder */}
          <p className="text-xs text-slate-400">
            Never share your login information with anyone
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}