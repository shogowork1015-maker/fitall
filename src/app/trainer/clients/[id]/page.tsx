import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { BodyWeightChart } from '@/components/charts/BodyWeightChart'
import { ExerciseWeightChart, type ExerciseChartData } from '@/components/charts/ExerciseWeightChart'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // trainer_trainee.trainer_id は trainer_profiles.id を参照するため先に取得
  const { data: trainerProfile } = await supabase
    .from('trainer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  // trainer_trainee.trainee_id は trainee_profiles.id を参照するため先に取得
  const { data: traineeProfileForCheck } = await supabase
    .from('trainee_profiles')
    .select('id')
    .eq('user_id', id)
    .maybeSingle()

  // このトレーニーが自分の担当かチェック
  const { data: relation } = trainerProfile && traineeProfileForCheck
    ? await supabase
        .from('trainer_trainee')
        .select('id')
        .eq('trainer_id', trainerProfile.id)
        .eq('trainee_id', traineeProfileForCheck.id)
        .eq('status', 'active')
        .maybeSingle()
    : { data: null }

  if (!relation) notFound()

  // トレーニー基本情報
  const { data: trainee } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', id)
    .maybeSingle()

  // トレーニープロフィール
  const { data: profile } = await supabase
    .from('trainee_profiles')
    .select('height, weight, goal')
    .eq('user_id', id)
    .maybeSingle()

  // 直近のワークアウトログ（最大10件）
  // workout_logs.trainee_id は trainee_profiles.id を参照する
  const { data: logs } = traineeProfileForCheck
    ? await supabase
        .from('workout_logs')
        .select('id, logged_at, memo')
        .eq('trainee_id', traineeProfileForCheck.id)
        .order('logged_at', { ascending: false })
        .limit(10)
    : { data: [] }

  const logIds = (logs ?? []).map((l) => l.id)

  // ワークアウトセットと種目情報を取得
  const { data: sets } = logIds.length
    ? await supabase
        .from('workout_sets')
        .select('log_id, weight_kg, reps, exercise_id')
        .in('log_id', logIds)
    : { data: [] }

  const exerciseIds = [
    ...new Set((sets ?? []).map((s) => s.exercise_id)),
  ]
  const { data: exercises } = exerciseIds.length
    ? await supabase
        .from('exercises')
        .select('id, name')
        .in('id', exerciseIds)
    : { data: [] }

  const exerciseMap = Object.fromEntries(
    (exercises ?? []).map((e) => [e.id, e.name])
  )

  type SetRow = { log_id: string; weight_kg: number; reps: number; exercise_id: string }

  // ログごとにセットをグループ化
  const setsByLog = (sets ?? []).reduce<Record<string, SetRow[]>>(
    (acc, s) => {
      if (!acc[s.log_id]) acc[s.log_id] = []
      acc[s.log_id]!.push(s as SetRow)
      return acc
    },
    {}
  )

  // 体重推移（直近30件）— body_records.trainee_id は trainee_profiles.id
  const { data: bodyRecords } = traineeProfileForCheck
    ? await supabase
        .from('body_records')
        .select('weight_kg, recorded_at')
        .eq('trainee_id', traineeProfileForCheck.id)
        .order('recorded_at', { ascending: true })
        .limit(30)
    : { data: [] }

  const bodyWeightData = (bodyRecords ?? []).map((r) => ({
    date: new Date(r.recorded_at).toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
    }),
    weight: r.weight_kg,
  }))

  // グラフ用: 直近30日の種目別最大重量推移
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
      name: exerciseMap[exId] ?? '不明',
      data: Object.entries(dateWeights)
        .map(([date, weight]) => ({ date, weight }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  // 予約履歴（最大5件）
  const { data: bookings } = trainerProfile
    ? await supabase
        .from('bookings')
        .select('id, scheduled_at, status, price')
        .eq('trainer_id', trainerProfile.id)
        .eq('trainee_id', id)
        .order('scheduled_at', { ascending: false })
        .limit(5)
    : { data: [] }

  const statusLabel: Record<string, string> = {
    pending: '未承認',
    confirmed: '確定',
    cancelled: 'キャンセル',
    completed: '完了',
  }

  const statusColor: Record<string, string> = {
    pending: 'bg-[#FEF3C7] text-[#92400E]',
    confirmed: 'bg-[#DCFCE7] text-[#166534]',
    cancelled: 'bg-[#F3F4F6] text-[#6B7280]',
    completed: 'bg-[#EFF6FF] text-[#1E40AF]',
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      {/* 戻るボタン＋名前 */}
      <div>
        <Link
          href="/trainer/clients"
          className="text-sm text-[#6B7280] flex items-center gap-1"
        >
          ← お客さん一覧
        </Link>
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#0A0A0A] mt-2">
          {trainee?.name}
        </h1>
      </div>

      {/* 基本情報 */}
      <div className="bg-white rounded-[20px] p-4 border border-[#E5E7EB] shadow-[0px_1px_3px_rgba(0,0,0,0.04),0px_1px_2px_rgba(0,0,0,0.06)]">
        <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-[0.1em] mb-3">基本情報</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-[#9CA3AF]">身長</p>
            <p className="text-base font-bold text-[#0A0A0A] mt-0.5">
              {profile?.height ? `${profile.height}cm` : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#9CA3AF]">体重</p>
            <p className="text-base font-bold text-[#0A0A0A] mt-0.5">
              {profile?.weight ? `${profile.weight}kg` : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#9CA3AF]">目標</p>
            <p className="text-xs font-medium text-[#0A0A0A] mt-0.5">
              {profile?.goal ?? '-'}
            </p>
          </div>
        </div>
      </div>

      {/* 成長グラフ */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-[#0A0A0A]">成長グラフ</h2>
        <div>
          <p className="text-xs text-[#6B7280] mb-2">体重推移</p>
          <BodyWeightChart data={bodyWeightData} />
        </div>
        {exerciseChartData.length > 0 && (
          <div>
            <p className="text-xs text-[#6B7280] mb-2">種目別重量推移（直近30日）</p>
            <ExerciseWeightChart exercises={exerciseChartData} />
          </div>
        )}
      </div>

      {/* 筋トレ履歴 */}
      <div>
        <h2 className="text-base font-bold text-[#0A0A0A] mb-3">
          直近のトレーニング
        </h2>
        {!logs?.length ? (
          <div className="bg-white rounded-[20px] p-6 text-center text-sm text-[#9CA3AF] border border-[#E5E7EB]">
            まだ記録がありません
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const logSets = setsByLog[log.id] ?? []
              // 種目ごとに最大重量を集計
              const exerciseSummary = logSets.reduce<
                Record<string, { name: string; maxWeight: number; totalReps: number }>
              >((acc, s) => {
                const name = exerciseMap[s.exercise_id] ?? '不明'
                if (!acc[s.exercise_id]) {
                  acc[s.exercise_id] = { name, maxWeight: 0, totalReps: 0 }
                }
                acc[s.exercise_id]!.maxWeight = Math.max(
                  acc[s.exercise_id]!.maxWeight,
                  s.weight_kg
                )
                acc[s.exercise_id]!.totalReps += s.reps
                return acc
              }, {})

              return (
                <div
                  key={log.id}
                  className="bg-white rounded-[20px] p-4 border border-[#E5E7EB] shadow-[0px_1px_3px_rgba(0,0,0,0.04),0px_1px_2px_rgba(0,0,0,0.06)]"
                >
                  <p className="text-sm font-bold text-[#0A0A0A] mb-2">
                    {new Date(log.logged_at).toLocaleDateString('ja-JP', {
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short',
                    })}
                  </p>
                  {Object.values(exerciseSummary).map((e) => (
                    <div
                      key={e.name}
                      className="flex justify-between text-sm py-1.5 border-b border-[#F3F4F6] last:border-0"
                    >
                      <span className="text-[#0A0A0A] font-medium">{e.name}</span>
                      <span className="text-[#6B7280]">
                        最大 {e.maxWeight}kg × {e.totalReps}reps
                      </span>
                    </div>
                  ))}
                  {log.memo && (
                    <p className="text-xs text-[#9CA3AF] mt-2">{log.memo}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 予約履歴 */}
      <div>
        <h2 className="text-base font-bold text-[#0A0A0A] mb-3">予約履歴</h2>
        {!bookings?.length ? (
          <div className="bg-white rounded-[20px] p-6 text-center text-sm text-[#9CA3AF] border border-[#E5E7EB]">
            まだ予約がありません
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-[20px] px-4 py-3 border border-[#E5E7EB] shadow-[0px_1px_3px_rgba(0,0,0,0.04),0px_1px_2px_rgba(0,0,0,0.06)] flex justify-between items-center"
              >
                <div>
                  <p className="text-sm font-semibold text-[#0A0A0A]">
                    {new Date(b.scheduled_at).toLocaleDateString('ja-JP')}
                  </p>
                  <p className="text-xs text-[#9CA3AF]">
                    ¥{b.price.toLocaleString()}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-[0.08em] px-[10px] py-[3px] rounded-[6px] ${statusColor[b.status] ?? 'bg-[#F3F4F6] text-[#6B7280]'}`}
                >
                  {statusLabel[b.status] ?? b.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
