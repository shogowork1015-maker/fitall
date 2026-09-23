import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseEnv } from './supabase-env'

// ブラウザ（クライアントコンポーネント）用Supabaseクライアント
export function createClient() {
  const { url, anonKey } = getSupabaseEnv()
  return createBrowserClient(
    url,
    anonKey
  )
}
