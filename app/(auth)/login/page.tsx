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

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [lastSubmitTime, setLastSubmitTime] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  
  // Set up CSRF protection on component mount
  useEffect(() => {
    const token = generateCsrfToken();
    setCsrfToken(token);
    storeCsrfToken(token);
  }, []);

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
    
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const submittedCsrfToken = formData.get('csrfToken') as string;
    
    // Validate CSRF token
    if (!validateCsrfToken(submittedCsrfToken)) {
      setError('Security verification failed. Please refresh the page');
      setLoading(false);
      return;
    }

    try {
      const result = await login({ email, password });

      if (result?.error) {
        // Map error to user-friendly message
        setError(mapAuthErrorToUserMessage(result.error));
        setLoading(false);
      } else {
        // Reset attempt counter on success
        setAttemptCount(0);
        // Use router for secure navigation
        router.push('/polls');
      }
    } catch (err) {
      setError('Connection error. Please try again');
      setLoading(false);
    }
  };

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