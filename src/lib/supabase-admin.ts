import { createClient } from '@supabase/supabase-js'

// サービスロールキーを使ったAdminクライアント（Cron・APIルート専用）
// SUPABASE_SERVICE_ROLE_KEY を .env.local に追加してください
export function createAdminSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
