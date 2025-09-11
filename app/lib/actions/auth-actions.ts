'use server';

import { createClient } from '@/lib/supabase/server';
import { LoginFormData, RegisterFormData } from '../types';
import { validateLoginForm } from '../utils/validation';
import { isRateLimited, resetRateLimit, logAuthEvent } from '../utils/security';

export async function login(data: LoginFormData) {
  try {
    // Step 1: Validate input data
    const validation = validateLoginForm(data);
    if (!validation.isValid) {
      return { error: validation.message };
    }

    // Step 2: Apply rate limiting
    // Use email as rate limit key - in production consider combining with IP
    const rateLimitKey = `login:${data.email.toLowerCase()}`;
    const { limited, remainingAttempts } = await isRateLimited(rateLimitKey);
    
    if (limited) {
      // Log excessive attempts
      await logAuthEvent('login_rate_limited', false, { 
        email: data.email, 
        details: 'Rate limit exceeded' 
      });
      
      return { error: 'Too many login attempts. Please try again later.' };
    }

    // Step 3: Attempt login with Supabase
    const supabase = await createClient();
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    // Step 4: Handle result and logging
    if (error) {
      // Log failed login attempt
      await logAuthEvent('login_failed', false, { 
        email: data.email, 
        details: error.message 
      });
      
      // For security, use a generic error message
      // But provide more details for common cases
      if (error.message.includes('Invalid login credentials')) {
        return { 
          error: `Invalid email or password${remainingAttempts > 0 ? `. ${remainingAttempts} attempts remaining` : ''}` 
        };
      }
      
      return { error: 'Login failed. Please try again.' };
    }

    // Step 5: Success path
    // Reset rate limit counter on successful login
    await resetRateLimit(rateLimitKey);
    
    // Log successful login
    await logAuthEvent('login_success', true, { 
      email: data.email,
      userId: authData.user?.id
    });

    // Return success
    return { error: null };
  } catch (err) {
    // Log unexpected errors
    console.error('Login error:', err);
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}

export async function register(data: RegisterFormData) {
  try {
    // Import validation utility
    const { validateRegisterForm } = await import('../utils/validation');
    const validation = validateRegisterForm(data);
    if (!validation.isValid) {
      return { error: validation.message };
    }

    // Apply rate limiting (for registration spam prevention)
    const { isRateLimited, logAuthEvent } = await import('../utils/security');
    const rateLimitKey = `register:${data.email.toLowerCase()}`;
    const { limited } = await isRateLimited(rateLimitKey);
    
    if (limited) {
      // Log excessive registration attempts
      await logAuthEvent('register_rate_limited', false, { 
        email: data.email,
        details: 'Registration rate limit exceeded' 
      });
      
      return { error: 'Too many registration attempts. Please try again later.' };
    }

    // Sanitize input - trim whitespace, etc.
    const sanitizedName = data.name.trim();
    
    // Attempt registration with Supabase
    const supabase = await createClient();
    const { error, data: authData } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: sanitizedName,
        },
      },
    });

    // Handle result and logging
    if (error) {
      // Log failed registration attempt
      await logAuthEvent('register_failed', false, { 
        email: data.email,
        details: error.message 
      });
      
      // Return a sanitized error message
      if (error.message.includes('already registered')) {
        return { error: 'This email address is already registered.' };
      }
      
      return { error: 'Registration failed. Please try again.' };
    }

    // Log successful registration
    await logAuthEvent('register_success', true, { 
      email: data.email,
      userId: authData?.user?.id
    });

    // Return success
    return { error: null };
  } catch (err) {
    // Log unexpected errors
    console.error('Registration error:', err);
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}

export async function logout() {
  try {
    // Get current user before logout for logging
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    const email = userData?.user?.email;
    
    // Attempt logout
    const { error } = await supabase.auth.signOut();
    
    // Handle errors
    if (error) {
      // Log failed logout attempt
      const { logAuthEvent } = await import('../utils/security');
      await logAuthEvent('logout_failed', false, { 
        userId,
        email,
        details: error.message 
      });
      
      return { error: 'Logout failed. Please try again.' };
    }
    
    // Log successful logout
    const { logAuthEvent } = await import('../utils/security');
    await logAuthEvent('logout_success', true, { 
      userId,
      email
    });
    
    return { error: null };
  } catch (err) {
    console.error('Logout error:', err);
    return { error: 'An unexpected error occurred during logout.' };
  }
}

export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting current user:', error.message);
      return null;
    }
    
    return data.user;
  } catch (err) {
    console.error('Unexpected error in getCurrentUser:', err);
    return null;
  }
}

export async function getSession() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error.message);
      return null;
    }
    
    return data.session;
  } catch (err) {
    console.error('Unexpected error in getSession:', err);
    return null;
  }
}
