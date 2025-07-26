import { createClient } from '@supabase/supabase-js';

// Extract Supabase URL and key from DATABASE_URL
// Format: postgresql://postgres.[project-ref]:[password]@aws-0-us-east-2.pooler.supabase.com:6543/postgres
function extractSupabaseCredentials(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl);
    const projectRef = url.username.split('.')[1];
    const supabaseUrl = `https://${projectRef}.supabase.co`;
    
    // For now, we'll need the anon key to be provided separately
    // This is a placeholder - user will need to provide the actual anon key
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key-here';
    
    return { supabaseUrl, anonKey };
  } catch (error) {
    console.error('Failed to extract Supabase credentials:', error);
    return null;
  }
}

// For development, we'll use environment variables directly
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Auth helper functions
export const auth = {
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
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
  }
};