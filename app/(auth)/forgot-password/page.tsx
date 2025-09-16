import React from 'react';
import { ForgotPasswordForm } from '../components/forgot-password-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password | ALX Polly',
  description: 'Reset your ALX Polly account password',
};

export default function ForgotPasswordPage() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-screen py-12">
      <div className="w-full max-w-md mb-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Forgot Password?</h1>
          <p className="text-muted-foreground">
            No worries, we'll send you reset instructions
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}