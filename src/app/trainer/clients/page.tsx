import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'
import { formatJstDate, formatJstDateKey, formatJstTime, jstMonthBounds } from '@/lib/datetime'
import { loadTicketSummaries } from '@/lib/ticket-summary'
import { ClientList, type ClientRow } from './ClientList'

// 最後に来た日の見せ方（今日なら時刻まで、それ以外は 11/6 のように）
function lastVisitLabel(value: string, todayKey: string) {
  if (formatJstDateKey(value) === todayKey) return `今日 ${formatJstTime(value)}`
  return formatJstDate(value, { month: 'numeric', day: 'numeric' })
}

export default async function TrainerClientsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const devAuthBypass = isDevAuthBypassEnabled()

  if (!user && !devAuthBypass) redirect('/auth/login')

  if (!user && devAuthBypass) {
    return (
      <ClientList
        preview
        clients={[
          { id: 'preview-1', name: '佐藤 美咲', last: '今日 10:00', sessions: 3, credits: 2, ticketName: '4回チケット' },
          { id: 'preview-2', name: '鈴木 大輔', last: '11/6', sessions: 2, credits: 5, ticketName: '8回チケット' },
          { id: 'preview-3', name: '山本 結衣', last: '11/2', sessions: 1, credits: 1, ticketName: '4回チケット', lastDate: '11/2' },
          { id: 'preview-4', name: '高橋 優', last: '10/30', sessions: 0, credits: 0, ticketName: '月謝', lastDate: '10/30' },
        ]}
      />
    )
  }

  const { data: profile } = await supabase
    .from('trainer_profiles')
    .select('id')
    .eq('user_id', user!.id)
    .maybeSingle()

  const { data: relations } = profile
    ? await supabase
        .from('trainer_trainee')
        .select('trainee_id')
        .eq('trainer_id', profile.id)
        .eq('status', 'active')
    : { data: [] }

  const traineeProfileIds = (relations ?? [])
    .map((r) => r.trainee_id)
    .filter(Boolean) as string[]

  if (!traineeProfileIds.length) {
    return <ClientList clients={[]} />
  }

  const { data: traineeProfiles } = await supabase
    .from('trainee_profiles')
    .select('id, user_id')
    .in('id', traineeProfileIds)

  const traineeUserIds = (traineeProfiles ?? [])
    .map((p) => p.user_id)
    .filter(Boolean) as string[]

  if (!traineeUserIds.length) {
    return <ClientList clients={[]} />
  }

  const { data: trainees } = await supabase
    .from('users')
    .select('id, name')
    .in('id', traineeUserIds)

  const profileIdToUserId = Object.fromEntries(
    (traineeProfiles ?? []).map((p) => [p.id, p.user_id])
  )

  const todayKey = formatJstDateKey()
  const { start: monthStart } = jstMonthBounds(todayKey)
  const nowIso = new Date().toISOString()

  // 確定・完了した予約から「今月の回数」と「最後に来た日」を出す
  const { data: visits } = profile
    ? await supabase
        .from('bookings')
        .select('trainee_id, scheduled_at')
        .eq('trainer_id', profile.id)
        .in('trainee_id', traineeProfileIds)
        .in('status', ['confirmed', 'completed'])
        .lte('scheduled_at', nowIso)
        .order('scheduled_at', { ascending: false })
    : { data: [] }

  const sessionCounts: Record<string, number> = {}
  const lastVisitMap: Record<string, string> = {}
  for (const visit of visits ?? []) {
    const userId = profileIdToUserId[visit.trainee_id]
    if (!userId) continue
    if (!lastVisitMap[userId]) lastVisitMap[userId] = visit.scheduled_at
    if (visit.scheduled_at >= monthStart.toISOString()) sessionCounts[userId] = (sessionCounts[userId] ?? 0) + 1
  }

  const tickets = profile ? await loadTicketSummaries(supabase, [profile.id], traineeProfileIds) : {}
  const userIdToProfileId = Object.fromEntries((traineeProfiles ?? []).map((p) => [p.user_id, p.id]))

  const { data: creditRows } = profile
    ? await supabase
        .from('session_credits')
        .select('trainee_id, status')
        .eq('trainer_id', profile.id)
        .in('trainee_id', traineeProfileIds)
        .in('status', ['available', 'scheduled'])
    : { data: [] }

  const creditCountByUserId: Record<string, number> = {}
  for (const credit of creditRows ?? []) {
    const userId = profileIdToUserId[credit.trainee_id]
    if (userId) creditCountByUserId[userId] = (creditCountByUserId[userId] ?? 0) + 1
  }

  const clients: ClientRow[] = (trainees ?? [])
    .map((trainee) => {
      const lastVisit = lastVisitMap[trainee.id]
      return {
        id: trainee.id,
        name: trainee.name ?? 'お客様',
        last: lastVisit ? lastVisitLabel(lastVisit, todayKey) : 'まだ来ていません',
        lastDate: lastVisit ? formatJstDate(lastVisit, { month: 'numeric', day: 'numeric' }) : 'なし',
        sessions: sessionCounts[trainee.id] ?? 0,
        credits: creditCountByUserId[trainee.id] ?? 0,
        ticketName: tickets[userIdToProfileId[trainee.id] ?? '']?.ticketName ?? null,
      }
    })
    // 最近来た順
    .sort((a, b) => (lastVisitMap[b.id] ?? '').localeCompare(lastVisitMap[a.id] ?? ''))

  return <ClientList clients={clients} />
}
