import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ExerciseWeightChart, type ExerciseChartData } from '@/components/charts/ExerciseWeightChart'
import { WorkoutCalendar } from './WorkoutCalendar'

// ストリーク計算（連続トレーニング日数）
function calcStreak(dates: string[]): number {
  if (!dates.length) return 0
  const dateSet = new Set(dates)

  const today = new Date()
  function isoDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  // 今日または昨日を起点にしてさかのぼる
  let start = new Date(today)
  if (!dateSet.has(isoDate(start))) {
    start = new Date(today)
    start.setDate(start.getDate() - 1)
    if (!dateSet.has(isoDate(start))) return 0
  }

  let streak = 0
  const d = new Date(start)
  while (streak < 365) {
    if (dateSet.has(isoDate(d))) {
      streak++
      d.setDate(d.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

export default async function TraineeHistoryPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // workout_logs.trainee_id は trainee_profiles.id を参照するため先に取得
  const { data: traineeProfile } = await supabase
    .from('trainee_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  // 全トレーニング日（カレンダー + ストリーク用）
  const { data: allLogs } = traineeProfile
    ? await supabase
        .from('workout_logs')
        .select('logged_at')
        .eq('trainee_id', traineeProfile.id)
        .order('logged_at', { ascending: false })
    : { data: [] }

  const workoutDates = [
    ...new Set((allLogs ?? []).map((l) => l.logged_at.split('T')[0] as string)),
  ]
  const streak = calcStreak(workoutDates)

  // 過去のワークアウトログ（最大30件）
  const { data: logs } = traineeProfile
    ? await supabase
        .from('workout_logs')
        .select('id, logged_at, memo')
        .eq('trainee_id', traineeProfile.id)
        .order('logged_at', { ascending: false })
        .limit(30)
    : { data: [] }

  const logIds = (logs ?? []).map((l) => l.id)

  const { data: sets } = logIds.length
    ? await supabase
        .from('workout_sets')
        .select('id, log_id, exercise_id, set_number, weight_kg, reps')
        .in('log_id', logIds)
        .order('set_number')
    : { data: [] }

  const exIds = [...new Set((sets ?? []).map((s) => s.exercise_id))]
  const { data: exercises } = exIds.length
    ? await supabase.from('exercises').select('id, name').in('id', exIds)
    : { data: [] }

  const exMap = Object.fromEntries((exercises ?? []).map((e) => [e.id, e.name]))

  // ログごとにセットをグループ化
  const setsByLog = (sets ?? []).reduce<
    Record<string, { exercise_id: string; set_number: number; weight_kg: number; reps: number }[]>
  >((acc, s) => {
    if (!acc[s.log_id]) acc[s.log_id] = []
    acc[s.log_id]!.push(s)
    return acc
  }, {})

  // グラフ用データ: 直近30日の種目別最大重量推移
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recentLogs = (logs ?? []).filter(
    (l) => new Date(l.logged_at) >= thirtyDaysAgo
  )

  const exerciseDataMap: Record<string, Record<string, number>> = {}
  for (const log of recentLogs) {
    const dateStr = new Date(log.logged_at).toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
    })
    const logSets = setsByLog[log.id] ?? []
    for (const s of logSets) {
      if (!exerciseDataMap[s.exercise_id]) exerciseDataMap[s.exercise_id] = {}
      exerciseDataMap[s.exercise_id]![dateStr] = Math.max(
        exerciseDataMap[s.exercise_id]![dateStr] ?? 0,
        s.weight_kg
      )
    }
  }

  const exerciseChartData: ExerciseChartData[] = Object.entries(exerciseDataMap)
    .map(([exId, dateWeights]) => ({
      id: exId,
      name: exMap[exId] ?? '不明',
      data: Object.entries(dateWeights)
        .map(([date, weight]) => ({ date, weight }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#0066FF]">記録</p>
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#0A0A0A] mt-0.5">
          これまでの記録
        </h1>
      </div>

      {/* カレンダー + ストリーク */}
      <WorkoutCalendar workoutDates={workoutDates} streak={streak} />

      {/* 種目別重量推移グラフ */}
      {exerciseChartData.length > 0 && (
        <div className="bg-white rounded-[16px] p-4 border border-[#E5E7EB]">
          <h2 className="text-base font-bold text-[#0A0A0A] mb-1">
            種目ごとの重量推移（直近30日）
          </h2>
          <p className="text-xs text-[#6B7280] mb-4">記録がある種目だけ表示されます</p>
          <ExerciseWeightChart exercises={exerciseChartData} />
        </div>
      )}

      {/* 履歴一覧 */}
      {!logs?.length ? (
        <div className="bg-white rounded-[16px] p-10 text-center border border-[#E5E7EB]">
          <p className="text-4xl mb-4" aria-hidden>💪</p>
          <p className="text-base font-bold text-[#0A0A0A] mb-1">まだ記録がありません</p>
          <p className="text-sm text-[#6B7280] mb-8 leading-relaxed">
            トレーニング画面からセットを入れると、
            <br />
            ここに日付ごとの一覧が並びます
          </p>
          <Link
            href="/trainee/workout"
            className="inline-flex h-14 items-center justify-center rounded-full bg-[#0A0A0A] px-8 text-sm font-bold text-white active:scale-[0.98] transition-transform"
          >
            今日のトレーニングを記録しよう！
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[#6B7280] uppercase tracking-[0.1em]">日付ごと</h2>
          {logs.map((log) => {
            const logSets = setsByLog[log.id] ?? []

            const byExercise = logSets.reduce<
              Record<string, { name: string; sets: { w: number; r: number }[] }>
            >((acc, s) => {
              if (!acc[s.exercise_id]) {
                acc[s.exercise_id] = { name: exMap[s.exercise_id] ?? '不明', sets: [] }
              }
              acc[s.exercise_id]!.sets.push({ w: s.weight_kg, r: s.reps })
              return acc
            }, {})

            // ボリューム合計
            const volume = logSets.reduce((sum, s) => sum + s.weight_kg * s.reps, 0)

            return (
              <div
                key={log.id}
                className="bg-white rounded-[16px] p-5 border border-[#E5E7EB]"
              >
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm font-bold text-[#0A0A0A]">
                    {new Date(log.logged_at).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short',
                    })}
                  </p>
                  {volume > 0 && (
                    <span className="text-xs text-[#6B7280] font-medium bg-[#F3F4F6] px-2 py-1 rounded-[6px] tabular-nums">
                      {volume >= 1000
                        ? `${(volume / 1000).toFixed(1)}t`
                        : `${volume.toLocaleString()}kg`}
                    </span>
                  )}
                </div>

                {Object.values(byExercise).length === 0 ? (
                  <p className="text-sm text-[#9CA3AF]">記録なし</p>
                ) : (
                  <div className="space-y-3">
                    {Object.values(byExercise).map((ex) => (
                      <div key={ex.name}>
                        <p className="text-sm font-bold text-[#0A0A0A] mb-1">{ex.name}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ex.sets.map((s, i) => (
                            <span
                              key={i}
                              className="text-xs bg-[#F3F4F6] text-[#6B7280] px-2.5 py-1 rounded-[6px] tabular-nums"
                            >
                              {s.w}kg × {s.r}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {log.memo && (
                  <p className="text-xs text-[#9CA3AF] mt-3 pt-3 border-t border-[#E5E7EB]">
                    {log.memo}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
