"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/hooks/use-auth";
import { AuthError } from "@/lib/auth/types/auth.types";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    general?: string;
  }>({});
  
  const router = useRouter();
  const { toast } = useToast();
  const { resetPassword } = useAuth();

  const validateForm = () => {
    const newErrors: {
      email?: string;
    } = {};

    // Client-side validation for immediate feedback
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const result = await resetPassword({ email });

      if (result.success) {
        setSubmitted(true);
        toast({
          title: "Reset email sent",
          description: "If an account exists with that email, you will receive password reset instructions.",
          variant: "default",
        });
      } else {
        // For security reasons, we don't reveal whether the email exists or not
        // We just show a generic success message to prevent email enumeration
        setSubmitted(true);
        toast({
          title: "Reset email sent",
          description: "If an account exists with that email, you will receive password reset instructions.",
          variant: "default",
        });
      }
    } catch (error) {
      const authError = error as AuthError;
      // We still maintain the same UX, but log the error
      console.error("Password reset error:", authError);
      
      setSubmitted(true);
      toast({
        title: "Reset email sent",
        description: "If an account exists with that email, you will receive password reset instructions.",
        variant: "default",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Check Your Email</CardTitle>
          <CardDescription className="text-center">
            We have sent password reset instructions to your email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-4">
            If you don't see the email, check your spam folder or try again.
          </p>
          <Button
            variant="outline"
            onClick={() => setSubmitted(false)}
            className="mr-2"
          >
            Try again
          </Button>
          <Button asChild>
            <Link href="/login">
              Return to login
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
        <CardDescription className="text-center">
          Enter your email address and we'll send you a link to reset your password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-red-500">
                {errors.email}
              </p>
            )}
          </div>

          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Sending reset link..." : "Send reset link"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-center">
          Remember your password?{" "}
          <Link 
            href="/login"
            className="font-semibold text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}