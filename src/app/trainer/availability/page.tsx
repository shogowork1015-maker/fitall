import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AvailabilityManager } from './AvailabilityManager'
import { readTrainerSettingsFromBio } from '@/lib/trainer-settings'
import { loadTraineeNameMap } from '@/lib/trainee-display'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'
import { addDaysToDateKey, dayOfWeekForDateKey, formatJstDateKey, jstDayBounds } from '@/lib/datetime'

function expandWeeklyRowsToDateSlots(rows: { day_of_week: number; start_time: string; end_time: string }[]) {
  const startKey = addDaysToDateKey(formatJstDateKey(), -30)
  const result: { slot_date: string; start_time: string; end_time: string }[] = []

  for (let offset = 0; offset <= 210; offset += 1) {
    const key = addDaysToDateKey(startKey, offset)
    const row = rows.find((r) => r.day_of_week === dayOfWeekForDateKey(key))
    if (!row) continue
    result.push({
      slot_date: key,
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

  const devAuthBypass = isDevAuthBypassEnabled()

  if (!user && !devAuthBypass) redirect('/auth/login')

  if (!user && devAuthBypass) {
    return (
      <div className="fitall-page fitall-scroll">
        <div className="fitall-topbar">
          <Link href="/trainer/bookings" className="flex items-center gap-1 text-sm font-black text-[#555555]">
            ‹ 戻る
          </Link>
          <h1 className="text-[17px] font-black text-[#0A0A0A]">空き時間</h1>
          <div className="w-10" />
        </div>

        <div className="px-4 py-6 space-y-4">
          <div className="fitall-card bg-[#E8FBFA] px-4 py-3 text-xs font-black leading-relaxed text-[#087D78]">
            開発用UI確認モードです。空き時間設定の保存はログイン後に有効になります。
          </div>
          <div className="fitall-card p-5">
            <h2 className="text-sm font-black text-[#0A0A0A]">受付時間サンプル</h2>
            <div className="mt-4 space-y-3">
              {[
                ['月', '10:00 - 20:00'],
                ['火', '09:00 - 18:00'],
                ['木', '11:00 - 20:00'],
                ['土', '09:00 - 14:00'],
              ].map(([day, time]) => (
                <div key={day} className="flex items-center justify-between rounded-[6px] bg-[#F4F7F7] px-4 py-3">
                  <span className="text-sm font-bold text-[#0A0A0A]">毎週{day}曜日</span>
                  <span className="text-xs font-black text-[#087D78]">{time}</span>
                </div>
              ))}
            </div>
          </div>
          <Link
            href="/trainer/bookings"
            className="fitall-primary-action fitall-tap"
          >
            予約カレンダーへ戻る
          </Link>
        </div>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('trainer_profiles')
    .select('id, bio')
    .eq('user_id', user!.id)
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

  const trainerIdsForQuery = [profile?.id, user!.id].filter(Boolean) as string[]
  const { start: rangeStart } = jstDayBounds(addDaysToDateKey(formatJstDateKey(), -60))
  const { end: rangeEnd } = jstDayBounds(addDaysToDateKey(formatJstDateKey(), 180))

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

  const traineeNameMap = await loadTraineeNameMap(
    supabase,
    (bookings ?? []).map((b) => b.trainee_id)
  )

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
    <div className="fitall-page fitall-scroll">
      <div className="fitall-topbar">
        <Link href="/trainer/bookings" className="flex items-center gap-1 text-sm font-black text-[#555555]">
          ‹ 戻る
        </Link>
        <h1 className="text-[17px] font-black text-[#0A0A0A]">空き時間</h1>
        <Link href="/trainer/settings" className="text-sm font-black text-[#087D78]">
          設定
        </Link>
      </div>

      <div className="px-4 py-6 space-y-4">
        <p className="text-xs text-[#666666] px-1">
          受付する日付・時間帯を設定してください。設定がない日はお客様が予約できません。
          営業時間: {trainerSettings.business_open} - {trainerSettings.business_close}
        </p>

        <AvailabilityManager
          initialSlots={availability ?? []}
          initialBookings={initialBookings}
          clientOptions={clientOptions}
          menuOptions={plans ?? []}
        />
      </div>
    </div>
  )
}
