import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AvailabilityManager } from './AvailabilityManager'
import { readTrainerSettingsFromBio } from '@/lib/trainer-settings'
import { loadTraineeNameMap } from '@/lib/trainee-display'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'
import { addDaysToDateKey, dayOfWeekForDateKey, formatJstDateKey, jstDayBounds } from '@/lib/datetime'
import { DevPreviewNote, HeaderAction, PageHeader } from '@/components/ui/PageHeader'
import { GearIcon } from '@/components/ui/Icons'

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
        <PageHeader title="空き時間" back={{ href: '/trainer/bookings', label: '予約へ戻る' }} />

        <div className="fitall-page-pad space-y-4">
          <DevPreviewNote>開発用の確認モード。空き時間設定の保存はログイン後に有効になります。</DevPreviewNote>
          <section aria-label="受付時間サンプル">
            <h2 className="fitall-group-label">受付時間</h2>
            <div className="fitall-group">
              {[
                ['月', '10:00 - 20:00'],
                ['火', '09:00 - 18:00'],
                ['木', '11:00 - 20:00'],
                ['土', '09:00 - 14:00'],
              ].map(([day, time]) => (
                <div key={day} className="fitall-row">
                  <span className="flex-1">毎週{day}曜日</span>
                  <span className="font-semibold tabular-nums text-ink-muted">{time}</span>
                </div>
              ))}
            </div>
          </section>
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
    name: traineeUserMap[p.user_id] ?? 'お客様',
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
    trainee_name: traineeNameMap[b.trainee_id] ?? 'お客様',
  }))

  return (
    <div className="fitall-page fitall-scroll">
      <PageHeader
        title="空き時間"
        back={{ href: '/trainer/bookings', label: '予約へ戻る' }}
        actions={
          <HeaderAction href="/trainer/settings" label="設定">
            <GearIcon />
          </HeaderAction>
        }
      />

      <div className="px-4 py-6 space-y-4">
        <p className="text-subhead text-ink-muted px-1">
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
