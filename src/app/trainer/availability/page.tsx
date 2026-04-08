import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AvailabilityManager } from './AvailabilityManager'
import { readTrainerSettingsFromBio } from '@/lib/trainer-settings'

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function expandWeeklyRowsToDateSlots(rows: { day_of_week: number; start_time: string; end_time: string }[]) {
  const now = new Date()
  const start = addDays(now, -30)
  const end = addDays(now, 180)
  const result: { slot_date: string; start_time: string; end_time: string }[] = []

  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    const row = rows.find((r) => r.day_of_week === cursor.getDay())
    if (!row) continue
    result.push({
      slot_date: toDateKey(cursor),
      start_time: row.start_time,
      end_time: row.end_time,
    })
  }
  return result
}

export default async function TrainerAvailabilityPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('trainer_profiles')
    .select('id, bio')
    .eq('user_id', user.id)
    .maybeSingle()

  let availability: { slot_date: string; start_time: string; end_time: string }[] = []
  const trainerSettings = readTrainerSettingsFromBio(profile?.bio)
  if (profile) {
    const { data, error } = await supabase
      .from('trainer_availability')
      .select('slot_date, start_time, end_time')
      .eq('trainer_id', profile.id)
      .order('slot_date')

    if (error && (error.code === 'PGRST204' || error.message?.includes("'slot_date' column"))) {
      const { data: legacyData } = await supabase
        .from('trainer_availability')
        .select('day_of_week, start_time, end_time')
        .eq('trainer_id', profile.id)
        .order('day_of_week')
      availability = expandWeeklyRowsToDateSlots(legacyData ?? [])
    } else {
      availability = data ?? []
    }
  }

  const trainerIdsForQuery = [profile?.id, user.id].filter(Boolean) as string[]
  const rangeStart = new Date()
  rangeStart.setDate(rangeStart.getDate() - 60)
  const rangeEnd = new Date()
  rangeEnd.setDate(rangeEnd.getDate() + 180)

  const { data: bookings } = trainerIdsForQuery.length
    ? await supabase
        .from('bookings')
        .select('id, scheduled_at, status, trainee_id')
        .in('trainer_id', trainerIdsForQuery)
        .in('status', ['pending', 'confirmed', 'completed'])
        .gte('scheduled_at', rangeStart.toISOString())
        .lte('scheduled_at', rangeEnd.toISOString())
        .order('scheduled_at')
    : { data: [] }

  const traineeIds = [...new Set((bookings ?? []).map((b) => b.trainee_id))]
  const { data: trainees } = traineeIds.length
    ? await supabase.from('users').select('id, name').in('id', traineeIds)
    : { data: [] }
  const traineeNameMap = Object.fromEntries((trainees ?? []).map((t) => [t.id, t.name]))

  const { data: activeRelations } = profile
    ? await supabase
        .from('trainer_trainee')
        .select('trainee_id')
        .eq('trainer_id', profile.id)
        .eq('status', 'active')
    : { data: [] }
  const relationTraineeIds = (activeRelations ?? []).map((r) => r.trainee_id)
  const { data: traineeProfiles } = relationTraineeIds.length
    ? await supabase
        .from('trainee_profiles')
        .select('id, user_id')
        .in('id', relationTraineeIds)
    : { data: [] }
  const traineeUserIds = (traineeProfiles ?? []).map((t) => t.user_id)
  const { data: traineeUsers } = traineeUserIds.length
    ? await supabase.from('users').select('id, name').in('id', traineeUserIds)
    : { data: [] }
  const traineeUserMap = Object.fromEntries((traineeUsers ?? []).map((u) => [u.id, u.name]))
  const clientOptions = (traineeProfiles ?? []).map((p) => ({
    trainee_id: p.id,
    name: traineeUserMap[p.user_id] ?? 'お客さん',
  }))

  const { data: plans } = profile
    ? await supabase
        .from('plans')
        .select('id, name, price')
        .eq('trainer_id', profile.id)
        .order('created_at')
    : { data: [] }

  const initialBookings = (bookings ?? []).map((b) => ({
    id: b.id,
    scheduled_at: b.scheduled_at,
    status: b.status,
    trainee_name: traineeNameMap[b.trainee_id] ?? 'お客さん',
  }))

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-2 mb-3">
          <Link href="/trainer/bookings" className="text-sm text-[#6B7280] flex items-center gap-1">
          ← 予約管理に戻る
          </Link>
          <Link href="/trainer/settings" className="text-sm font-semibold text-[#0066FF]">
            運営設定へ
          </Link>
        </div>
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#0A0A0A]">空き時間の設定</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          受付する日付・時間帯を設定してください。設定がない日はトレーニーが予約できません。
        </p>
        <p className="text-xs text-[#9CA3AF] mt-1">
          営業時間: {trainerSettings.business_open} - {trainerSettings.business_close}
        </p>
      </div>

      <AvailabilityManager
        initialSlots={availability ?? []}
        initialBookings={initialBookings}
        clientOptions={clientOptions}
        menuOptions={plans ?? []}
      />
    </div>
  )
}
