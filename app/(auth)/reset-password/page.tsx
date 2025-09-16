import React from 'react';
import { ResetPasswordForm } from '../components/reset-password-form';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset Password | ALX Polly',
  description: 'Create a new password for your ALX Polly account',
};

export default function ResetPasswordPage() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-screen py-12">
      <div className="w-full max-w-md mb-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Reset Password</h1>
          <p className="text-muted-foreground">
            Create a new secure password for your account
          </p>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  );
}