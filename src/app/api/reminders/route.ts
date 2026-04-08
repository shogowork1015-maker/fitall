import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

// メール送信ヘルパー（Resend API 使用）
// RESEND_API_KEY を .env.local に追加してください
async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // メールAPIキーが未設定の場合はコンソールに出力
    console.log(`[reminder] TO: ${to}\nSUBJECT: ${subject}\n${html}`)
    return
  }

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'FITALL <noreply@fitall.app>',
      to,
      subject,
      html,
    }),
  })
}

export async function GET(req: NextRequest) {
  // Vercel Cron の認証チェック
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminSupabaseClient()

  // 翌日の確定済み予約を取得
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayStart = new Date(tomorrow)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(tomorrow)
  dayEnd.setHours(23, 59, 59, 999)

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, scheduled_at, trainee_id, trainer_id')
    .eq('status', 'confirmed')
    .gte('scheduled_at', dayStart.toISOString())
    .lte('scheduled_at', dayEnd.toISOString())

  if (error) {
    console.error('[reminders] fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!bookings?.length) {
    return NextResponse.json({ sent: 0 })
  }

  // trainee_id / trainer_id から emails を取得（trainer_id は trainer_profiles.id）
  const traineeUserIds = [...new Set(bookings.map((b) => b.trainee_id))]
  const trainerProfileIds = [...new Set(bookings.map((b) => b.trainer_id))]

  const { data: traineeUsers } = await supabase
    .from('users')
    .select('id, name, email')
    .in('id', traineeUserIds)

  const { data: trainerProfiles } = await supabase
    .from('trainer_profiles')
    .select('id, user_id')
    .in('id', trainerProfileIds)

  const trainerUserIds = (trainerProfiles ?? []).map((p) => p.user_id)
  const { data: trainerUsers } = trainerUserIds.length
    ? await supabase.from('users').select('id, name, email').in('id', trainerUserIds)
    : { data: [] }

  const traineeMap = Object.fromEntries((traineeUsers ?? []).map((u) => [u.id, u]))
  const trainerProfileToUser = Object.fromEntries(
    (trainerProfiles ?? []).map((p) => [p.id, p.user_id])
  )
  const trainerUserMap = Object.fromEntries((trainerUsers ?? []).map((u) => [u.id, u]))

  let sent = 0

  for (const booking of bookings) {
    const scheduledDate = new Date(booking.scheduled_at)
    const dateStr = scheduledDate.toLocaleDateString('ja-JP', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    })
    const timeStr = scheduledDate.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    })

    // トレーニーへのメール
    const trainee = traineeMap[booking.trainee_id]
    if (trainee?.email) {
      await sendEmail(
        trainee.email,
        `【FITALL】明日のパーソナルトレーニングのお知らせ`,
        `
          <p>${trainee.name} さん</p>
          <p>明日のパーソナルトレーニングのお知らせです。</p>
          <p><strong>${dateStr} ${timeStr}</strong> にセッションが予定されています。</p>
          <p>ご不明な点はトレーナーにご連絡ください。</p>
          <br>
          <p>FITALL</p>
        `
      )
      sent++
    }

    // トレーナーへのメール
    const trainerUserId = trainerProfileToUser[booking.trainer_id]
    const trainerUser = trainerUserId ? trainerUserMap[trainerUserId] : null
    if (trainerUser?.email && trainee) {
      await sendEmail(
        trainerUser.email,
        `【FITALL】明日のセッション: ${trainee.name} さん`,
        `
          <p>${trainerUser.name} さん</p>
          <p>明日のセッションのお知らせです。</p>
          <p>お客さん: <strong>${trainee.name}</strong></p>
          <p>日時: <strong>${dateStr} ${timeStr}</strong></p>
          <br>
          <p>FITALL</p>
        `
      )
      sent++
    }
  }

  return NextResponse.json({ sent, bookings: bookings.length })
}
