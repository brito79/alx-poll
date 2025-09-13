"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/app/lib/context/auth-context";

/**
 * Dashboard Layout Component
 * 
 * Provides the authenticated user interface shell for the application.
 * This component is foundational to the user experience as it:
 * 1. Creates a consistent UI framework for all authenticated pages
 * 2. Implements authentication protection for the dashboard area
 * 3. Provides global navigation and user account management
 * 4. Establishes the visual hierarchy and structure for the application
 * 
 * Used in: The Next.js routing system applies this layout to all pages
 * within the (dashboard) route group, including poll listing, creation,
 * and management pages. This is the primary interface after authentication.
 * 
 * @param {Object} props - Component properties
 * @param {ReactNode} props.children - Child components to render within layout
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();

  /**
   * Authentication Protection Effect
   * 
   * Redirects unauthenticated users to the login page.
   * This effect is critical to application security as it:
   * 1. Enforces authentication requirements for protected pages
   * 2. Prevents unauthorized access to user-specific content
   * 3. Creates a clean user flow for authentication requirements
   * 4. Completes the security boundary between public and private sections
   * 
   * This runs whenever the authentication state changes to ensure
   * consistent protection of dashboard resources.
   */
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  /**
   * Sign Out Handler Function
   * 
   * Manages the user logout process and subsequent navigation.
   * This function is important to the authentication lifecycle as it:
   * 1. Provides a clean logout mechanism for users
   * 2. Ensures proper session termination
   * 3. Directs users to the appropriate post-logout destination
   * 4. Creates a clear boundary between authenticated and unauthenticated states
   * 
   * Used when the user clicks the logout option in the account dropdown menu,
   * this function coordinates the authentication context and navigation system.
   */
  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  /**
   * Authentication Loading State Handler
   * 
   * Displays a loading indicator while authentication status is being determined.
   * This conditional rendering is important to the user experience as it:
   * 1. Prevents UI flicker during authentication checks
   * 2. Provides feedback that the system is working
   * 3. Avoids premature rendering of authenticated content
   * 4. Creates a smooth transition during authentication verification
   * 
   * This appears briefly during initial load and when verifying authentication status.
   */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <p>Loading user session...</p>
      </div>
    );
  }

  /**
   * Unauthenticated User Handler
   * 
   * Prevents content display for unauthenticated users during navigation.
   * This condition is a security measure that:
   * 1. Works with the useEffect redirect to ensure proper authentication
   * 2. Prevents momentary display of protected content to unauthenticated users
   * 3. Creates a clean transition between authentication states
   * 
   * This condition should rarely be visible as the useEffect will typically
   * redirect unauthenticated users before rendering completes.
   */
  if (!user) {
    return null;
  }

  /**
   * Dashboard UI Framework Rendering
   * 
   * Renders the complete authenticated application shell with navigation and user controls.
   * This layout structure is central to the application experience as it:
   * 1. Establishes consistent navigation and branding across authenticated pages
   * 2. Provides user account access and management
   * 3. Creates a responsive container for dynamic page content
   * 4. Maintains visual consistency throughout the authenticated experience
   * 
   * This structure wraps all dashboard pages with common header, navigation,
   * and footer elements to create a cohesive application experience.
   */
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/polls" className="text-xl font-bold text-slate-800">
            ALX Polly
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/polls" className="text-slate-600 hover:text-slate-900">
              My Polls
            </Link>
            <Link
              href="/create"
              className="text-slate-600 hover:text-slate-900"
            >
              Create Poll
            </Link>
          </nav>
          <div className="flex items-center space-x-4">
            <Button asChild>
              <Link href="/create">Create Poll</Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={
                        user?.user_metadata?.avatar_url ||
                        "/placeholder-user.jpg"
                      }
                      alt={user?.email || "User"}
                    />
                    <AvatarFallback>
                      {user?.email ? user.email[0].toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href="/profile" className="w-full">
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/settings" className="w-full">
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
      <footer className="border-t bg-white py-4">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} ALX Polly. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
