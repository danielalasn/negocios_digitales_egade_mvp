import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qbcgansppauwtjkairsq.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_0TD8HWYMYlt47XSTaBZPog_5s01KsfT';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
