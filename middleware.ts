import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Global Next.js middleware that runs on every request matching the matcher config.
 * 
 * This middleware serves as the primary authentication boundary for the entire application.
 * It intercepts incoming requests and delegates to the Supabase middleware to:
 * 1. Verify user authentication status via session cookies
 * 2. Redirect unauthenticated users to the login page when accessing protected routes
 * 3. Allow public assets and authentication pages to be accessed without authentication
 * 
 * The middleware integrates with the authentication flow by managing Supabase session
 * cookies and applying route protection consistently across the application.
 * 
 * @param request The incoming Next.js request object
 * @returns Modified response with updated auth headers or a redirect to login
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

/**
 * Configuration that defines which routes the middleware applies to.
 * 
 * The matcher pattern includes all routes EXCEPT:
 * - Next.js internal routes (_next/static, _next/image)
 * - Authentication pages (login, register)
 * - Static assets (favicon.ico, images)
 * 
 * This ensures that authentication checks are applied to all application routes
 * while allowing unauthenticated access to public resources and auth pages.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|register|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}