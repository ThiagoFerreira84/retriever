// src/environments/environment.ts
// Development — values come from your Supabase project dashboard

export const environment = {
  production:           false,
  supabaseUrl:          'https://rkbjpzmqlqcrlcokupis.supabase.co',
  supabaseAnonKey:      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrYmpwem1xbHFjcmxjb2t1cGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2OTcxNjIsImV4cCI6MjA5MzI3MzE2Mn0.Ddbd6mDExXPIe8miW62dZhcn_m3ZRgniQUKZUH7PQcQ',
  contactEncryptSecret: '5b129e68becdb45d6b5447c2581fb71f9a5023361635543d6fd8310343e62437',
  // ⚠️  Must match CONTACT_ENCRYPT_SECRET in your Supabase Edge Functions
  // Generate with: openssl rand -hex 32
}
