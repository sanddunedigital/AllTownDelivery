import { createClient } from '@supabase/supabase-js';

// Extract Supabase URL from DATABASE_URL if needed
const extractedUrl = (() => {
  try {
    const dbUrl = import.meta.env.DATABASE_URL || '';
    if (dbUrl.includes('supabase.com')) {
      const url = new URL(dbUrl);
      const projectRef = url.hostname.split('.')[0].replace('aws-0-us-east-2.pooler.', '');
      return `https://${projectRef}.supabase.co`;
    }
    return null;
  } catch {
    return null;
  }
})();

// Use environment variables with fallback to extracted URL
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || extractedUrl;
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