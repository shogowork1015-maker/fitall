const FALLBACK_SUPABASE_URL = 'https://twobwwufaphtmejyxfon.supabase.co'
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3b2J3d3VmYXBodG1lanl4Zm9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzODU5MDEsImV4cCI6MjA5MDk2MTkwMX0.zjUg7i3BqUQ01yFzoOzGGXH5MVWOZCyvxsgWHmYA-qM'

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const requireExplicitEnv =
    process.env.VERCEL_ENV === 'production' || process.env.FITALL_REQUIRE_SUPABASE_ENV === '1'

  if (requireExplicitEnv && (!url || !anonKey)) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です')
  }

  return {
    url: url ?? FALLBACK_SUPABASE_URL,
    anonKey: anonKey ?? FALLBACK_SUPABASE_ANON_KEY,
  }
}
