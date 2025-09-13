import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates a server-side Supabase client instance for use in Server Components and Server Actions.
 * 
 * This function provides a configured Supabase client that:
 * 1. Runs in server-side contexts with full database access
 * 2. Manages authentication cookies through Next.js Cookie Store
 * 3. Enables secure data operations with server-side validation
 * 4. Supports row-level security policies defined in the database
 * 
 * The server client is used throughout the application for data operations that:
 * - Require server-side validation before database changes
 * - Need to enforce access control beyond client-side capabilities
 * - Must remain protected from client-side tampering
 * 
 * This is the primary data access pattern for server components, API routes,
 * and server actions, ensuring consistent and secure database operations.
 * 
 * @returns A configured Supabase client for server-side use
 */
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Use Next.js Cookie Store for reading cookies
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            // Update cookies in the Next.js Cookie Store
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            // Note: This try-catch handles the read-only headers limitation
            // in Server Components where cookies can't be modified directly.
          }
        },
      },
    }
  )
}