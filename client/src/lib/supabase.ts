import { createClient } from '@supabase/supabase-js';

// SECURITY FIX: Never extract DATABASE_URL on client side
// Use only VITE_SUPABASE_URL which is safe to expose

// Use only safe client-side environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Auth helper functions
export const auth = {
  signUp: async (email: string, password: string, options?: { emailRedirectTo?: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: options ? {
        emailRedirectTo: options.emailRedirectTo
      } : undefined
    });
    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },

  // Password management functions
  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  },

  updatePassword: async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    return { error };
  },

  // Update user details
  updateUser: async (updates: { email?: string; password?: string; data?: any }) => {
    const { data, error } = await supabase.auth.updateUser(updates);
    return { data, error };
  }
};