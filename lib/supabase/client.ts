import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a client-side Supabase client instance for use in Client Components.
 * 
 * This function provides a configured Supabase client that:
 * 1. Runs in browser contexts with appropriate permissions
 * 2. Automatically handles authentication state through cookies
 * 3. Respects row-level security policies defined in the database
 * 4. Enables real-time subscriptions and client-side queries
 * 
 * The client-side Supabase instance is used throughout the application's
 * Client Components for:
 * - Reading data with user-specific filtering
 * - Handling real-time updates and subscriptions
 * - Managing user authentication state in the UI
 * - Making authenticated requests subject to RLS policies
 * 
 * This client has limited permissions compared to the server-side client
 * and relies on database RLS policies for security rather than application code.
 * 
 * @returns A configured Supabase client for client-side use
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
