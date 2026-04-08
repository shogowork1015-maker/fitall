import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { WorkoutLogger } from './WorkoutLogger'

export default async function TraineeWorkoutPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // trainee_profiles.id を取得（なければ自動作成）
  let { data: traineeProfile } = await supabase
    .from('trainee_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!traineeProfile) {
    const { data: created, error: createError } = await supabase
      .from('trainee_profiles')
      .insert({ user_id: user.id })
      .select('id')
      .maybeSingle()
    traineeProfile = created
    if (createError) {
      console.error('[workout/page] trainee_profiles insert error:', JSON.stringify(createError))
    }
  }

  // 過去24時間以内のログを「今日のログ」として取得
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: todayLog } = traineeProfile
    ? await supabase
        .from('workout_logs')
        .select('id')
        .eq('trainee_id', traineeProfile.id)
        .gte('logged_at', since)
        .order('logged_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null }

  // 全ログID取得（PR計算用）
  const { data: allLogs } = traineeProfile
    ? await supabase
        .from('workout_logs')
        .select('id')
        .eq('trainee_id', traineeProfile.id)
    : { data: [] }

  const allLogIds = (allLogs ?? []).map((l) => l.id)

  // 種目別の自己ベスト（最高重量）を計算
  const { data: prSets } = allLogIds.length
    ? await supabase
        .from('workout_sets')
        .select('exercise_id, weight_kg')
        .in('log_id', allLogIds)
    : { data: [] }

  const initialPrMap: Record<string, number> = {}
  for (const s of prSets ?? []) {
    if (!initialPrMap[s.exercise_id] || s.weight_kg > initialPrMap[s.exercise_id]!) {
      initialPrMap[s.exercise_id] = s.weight_kg
    }
  }

  // 前回セッションの種目リスト（ルーティン用）
  const { data: lastLog } = traineeProfile
    ? await supabase
        .from('workout_logs')
        .select('id')
        .eq('trainee_id', traineeProfile.id)
        .lt('logged_at', since)
        .order('logged_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null }

  let lastRoutine: { id: string; name: string }[] = []

  if (lastLog) {
    const { data: lastSets } = await supabase
      .from('workout_sets')
      .select('exercise_id')
      .eq('log_id', lastLog.id)
      .order('set_number')

    // 重複なし・順序保持
    const orderedIds: string[] = []
    const seen = new Set<string>()
    for (const s of lastSets ?? []) {
      if (!seen.has(s.exercise_id)) {
        seen.add(s.exercise_id)
        orderedIds.push(s.exercise_id)
      }
    }

    if (orderedIds.length) {
      const { data: exData } = await supabase
        .from('exercises')
        .select('id, name')
        .in('id', orderedIds)

      const exMap = Object.fromEntries((exData ?? []).map((e) => [e.id, e.name]))
      lastRoutine = orderedIds
        .filter((id) => exMap[id])
        .map((id) => ({ id, name: exMap[id]! }))
    }
  }

  return (
    <WorkoutLogger
      traineeProfileId={traineeProfile?.id ?? null}
      logId={todayLog?.id ?? null}
      initialPrMap={initialPrMap}
      lastRoutine={lastRoutine}
    />
  )
}
