import { createClient } from '@supabase/supabase-js';

// Debug logs to see if environment variables are being picked up in the browser console
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL defined:', !!supabaseUrl);
console.log('Supabase Anon Key defined:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase configuration is missing. The app might not function correctly.");
}

// Ensure we have a valid-looking URL even if missing to prevent createClient from throwing
const validUrl = supabaseUrl && supabaseUrl.startsWith('http') 
  ? supabaseUrl 
  : 'https://placeholder-project.supabase.co';

export const supabase = createClient(
  validUrl,
  supabaseAnonKey || 'placeholder-key'
);
