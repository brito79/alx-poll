import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Updates the user session for each request using Supabase authentication.
 * 
 * This function is the core authentication mechanism for the application, called by
 * the global middleware to:
 * 1. Create a Supabase server client for the current request
 * 2. Read authentication cookies from the request
 * 3. Verify the user's authentication status
 * 4. Update cookies in the response when needed
 * 5. Redirect unauthenticated users to the login page
 * 
 * The function integrates Supabase's SSR (Server-Side Rendering) authentication
 * with Next.js middleware to provide seamless session management across the
 * application. It's the critical link between Supabase's auth system and
 * Next.js routing protection.
 * 
 * @param request The incoming Next.js request object
 * @returns NextResponse with updated cookies or a redirect
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Initialize Supabase client with cookie handling for the middleware context
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Verify if the user is authenticated by checking their session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Route protection logic:
  // If no authenticated user AND not accessing an auth-related page,
  // redirect to login page
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    // Redirect unauthenticated users to the login page
    // This is the primary security boundary preventing unauthorized access
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // User is authenticated or accessing a public route
  // Return the response with any updated cookies
  return supabaseResponse
}