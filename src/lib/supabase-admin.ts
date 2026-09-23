import { createClient } from '@supabase/supabase-js'

// サービスロールキーを使ったAdminクライアント（Cron・APIルート専用）
// SUPABASE_SERVICE_ROLE_KEY を .env.local に追加してください
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です')
  }

  return createClient(url, serviceRoleKey)
}
