import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { AvailabilityEditor } from './AvailabilityEditor'
import { readTrainerSettingsFromBio } from '@/lib/trainer-settings'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'
import { addDaysToDateKey, dayOfWeekForDateKey, formatJstDateKey } from '@/lib/datetime'
import { Screen } from '@/ui/Screen'
import { Section, Row } from '@/ui/List'

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
    // 確認モード用のサンプル：月・火・木・土に受付
    const sample = expandWeeklyRowsToDateSlots([
      { day_of_week: 1, start_time: '10:00:00', end_time: '20:00:00' },
      { day_of_week: 2, start_time: '09:00:00', end_time: '18:00:00' },
      { day_of_week: 4, start_time: '11:00:00', end_time: '20:00:00' },
      { day_of_week: 6, start_time: '09:00:00', end_time: '14:00:00' },
    ])
    return (
      <Screen title="空き時間" back={{ href: '/trainer/bookings', label: '予約' }}>
        <AvailabilityEditor initialSlots={sample} businessOpen="09:00" businessClose="21:00" preview />
      </Screen>
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

  return (
    <Screen title="空き時間" back={{ href: '/trainer/bookings', label: '予約' }}>
      {profile ? (
        <AvailabilityEditor
          initialSlots={availability}
          businessOpen={trainerSettings.business_open}
          businessClose={trainerSettings.business_close}
        />
      ) : (
        <Section group footer="プロフィールを作成すると、受付時間を設定できます。">
          <Row title="トレーナープロフィールが見つかりません" />
        </Section>
      )}
    </Screen>
  )
}
