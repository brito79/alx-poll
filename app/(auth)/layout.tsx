'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/lib/context/auth-context';

/**
 * Authentication Layout Component
 * 
 * Serves as the foundational layout wrapper for all authentication-related pages
 * (login, register, password reset, etc.). This component is critical to the application's
 * security model and user flow as it:
 * 
 * 1. Provides a consistent UI shell for all authentication screens
 * 2. Implements authenticated user redirection logic to prevent unnecessary auth page access
 * 3. Establishes the visual boundary between authenticated and non-authenticated app sections
 * 4. Handles loading states during authentication status verification
 * 
 * Used in: The Next.js routing system automatically applies this layout to all pages within 
 * the (auth) route group, including login and register pages. This layout is the parent 
 * container for those auth-specific pages.
 * 
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components (auth pages) to render within this layout
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  /**
   * Authentication Redirect Logic
   * 
   * Prevents authenticated users from accessing auth pages by redirecting them
   * to the main application. This effect is essential for:
   * 
   * 1. Maintaining proper application flow by avoiding redundant authentication screens
   * 2. Preventing confusion by ensuring users don't see login pages when already logged in
   * 3. Completing the authentication state management lifecycle
   * 
   * This effect runs whenever authentication state changes, ensuring the user's
   * navigation context always matches their authentication status.
   */
  useEffect(() => {
    if (!loading && user) {
      router.push('/polls');
    }
  }, [user, loading, router]);

  /**
   * Loading State Handler
   * 
   * Provides user feedback during authentication state verification.
   * This conditional rendering is important because:
   * 
   * 1. It prevents UI flicker during authentication checks
   * 2. It improves perceived performance by indicating system activity
   * 3. It avoids showing inappropriate UI states before auth status is confirmed
   * 
   * This loading state appears briefly during initial page load or when
   * authentication status is being re-verified.
   */
  if (loading) {
    return <div>Loading...</div>; // Or a loading spinner
  }

  /**
   * Authenticated User Handler
   * 
   * Prevents content flash by returning null for authenticated users.
   * This is a failsafe mechanism that:
   * 
   * 1. Works alongside the useEffect redirect to ensure authenticated users don't see auth pages
   * 2. Prevents momentary display of auth UI to authenticated users during navigation
   * 3. Provides a graceful transition between authentication states
   * 
   * This conditional acts as a secondary protection layer, though the useEffect
   * should typically handle the redirect before this renders.
   */
  if (user) {
    return null; // Should already be redirected by useEffect
  }

  /**
   * Authentication UI Framework Rendering
   * 
   * Renders the complete authentication page structure with header, content area, and footer.
   * This layout is fundamental to the application because it:
   * 
   * 1. Establishes a distinct visual identity for authentication flows
   * 2. Creates a focused environment without distractions for authentication tasks
   * 3. Provides consistent branding and user experience across all auth screens
   * 4. Centralizes layout logic for all authentication-related pages
   * 
   * This is the final rendered output that wraps each authentication page
   * (children) with consistent surrounding structure and styling.
   */
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="py-4 px-6 border-b bg-white">
        <div className="container mx-auto flex justify-center">
          <h1 className="text-2xl font-bold text-slate-800">ALX Polly</h1>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
      <footer className="py-4 px-6 border-t bg-white">
        <div className="container mx-auto text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} ALX Polly. All rights reserved.
        </div>
      </footer>
    </div>
  );
}