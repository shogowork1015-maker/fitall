import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { signOutAction } from '@/app/auth/login/actions'
import { BodyWeightChart } from '@/components/charts/BodyWeightChart'
import { BodyWeightInput } from '@/components/BodyWeightInput'

export default async function TraineeDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // トレーニー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('name')
    .eq('id', user.id)
    .maybeSingle()

  // トレーニープロフィール（複数存在する旧データも考慮）
  const { data: traineeProfiles } = await supabase
    .from('trainee_profiles')
    .select('id')
    .eq('user_id', user.id)

  const traineeProfileIds = (traineeProfiles ?? []).map((p) => p.id)
  const primaryTraineeProfileId = traineeProfileIds[0] ?? null

  let hasTrainer = false
  if (traineeProfileIds.length > 0) {
    const { data: relation } = await supabase
      .from('trainer_trainee')
      .select('id')
      .in('trainee_id', traineeProfileIds)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
    hasTrainer = !!relation
  }

  // 次回の予約（トレーナー紐付き時のみ取得）
  const { data: nextBooking } = hasTrainer
    ? await supabase
        .from('bookings')
        .select('scheduled_at, status')
        .in('trainee_id', traineeProfileIds)
        .eq('status', 'confirmed')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at')
        .limit(1)
        .maybeSingle()
    : { data: null }

  // 直近3件のトレーニング履歴（workout_logs.trainee_id = trainee_profiles.id）
  const { data: recentLogs } = primaryTraineeProfileId
    ? await supabase
        .from('workout_logs')
        .select('id, logged_at, memo')
        .eq('trainee_id', primaryTraineeProfileId)
        .order('logged_at', { ascending: false })
        .limit(3)
    : { data: [] }

  // 各ログのセット情報と種目名を取得
  const logIds = (recentLogs ?? []).map((l) => l.id)
  const { data: recentSets } = logIds.length
    ? await supabase
        .from('workout_sets')
        .select('log_id, exercise_id, weight_kg, reps')
        .in('log_id', logIds)
    : { data: [] }

  const exIds = [...new Set((recentSets ?? []).map((s) => s.exercise_id))]
  const { data: exercises } = exIds.length
    ? await supabase.from('exercises').select('id, name').in('id', exIds)
    : { data: [] }

  const exMap = Object.fromEntries((exercises ?? []).map((e) => [e.id, e.name]))

  // ログごとにセットをグループ化し種目名を集約
  const logSummary = (recentLogs ?? []).map((log) => {
    const sets = (recentSets ?? []).filter((s) => s.log_id === log.id)
    const exNames = [...new Set(sets.map((s) => exMap[s.exercise_id] ?? '不明'))]
    return { ...log, exerciseNames: exNames }
  })

  // 体重推移（直近30件）— body_records.trainee_id は trainee_profiles.id
  const { data: bodyRecords } = traineeProfileIds.length > 0
    ? await supabase
        .from('body_records')
        .select('weight_kg, body_fat_pct, recorded_at')
        .in('trainee_id', traineeProfileIds)
        .order('recorded_at', { ascending: true })
        .limit(30)
    : { data: [] }

  const bodyWeightData = (bodyRecords ?? []).map((r) => ({
    date: new Date(r.recorded_at).toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
    }),
    weight: r.weight_kg,
    bodyFat: r.body_fat_pct,
  }))

  // 今日のワークアウトログがあるかチェック（過去24時間）
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: todayLog } = primaryTraineeProfileId
    ? await supabase
        .from('workout_logs')
        .select('id')
        .eq('trainee_id', primaryTraineeProfileId)
        .gte('logged_at', since)
        .limit(1)
        .maybeSingle()
    : { data: null }

  const now = new Date()
  const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#0066FF]">
            {now.getMonth() + 1}月{now.getDate()}日（{WEEKDAYS[now.getDay()]}）
          </p>
          <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#0A0A0A] mt-0.5">
            {userData?.name ? `${userData.name} さん` : 'ようこそ'}
          </h1>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-sm font-medium text-[#6B7280] h-10 px-3 rounded-full hover:bg-[#F3F4F6] transition-colors"
          >
            ログアウト
          </button>
        </form>
      </div>

      {/* メインCTA：今日のトレーニング記録 */}
      <Link
        href="/trainee/workout"
        className="block bg-[#0A0A0A] rounded-[16px] p-5 text-center text-white active:scale-[0.98] transition-transform"
      >
        <p className="text-4xl mb-3" aria-hidden>💪</p>
        <p className="text-xl font-extrabold tracking-[-0.02em]">
          {todayLog ? '今日の記録を続ける' : '今日の記録を始める'}
        </p>
        <p className="mt-1.5 text-sm text-white/60">
          トレーニング画面へ
        </p>
      </Link>

      {/* 次回の予約（トレーナー紐付き時のみ表示） */}
      {hasTrainer && (
        <div>
          <h2 className="text-base font-bold text-[#0A0A0A] mb-3">次のセッション</h2>
          {nextBooking ? (
            <div className="bg-white rounded-[16px] px-5 py-4 border border-[#E5E7EB]">
              <p className="text-xs font-semibold text-[#6B7280]">確定済み</p>
              <p className="mt-1 text-xl font-bold text-[#0A0A0A]">
                {new Date(nextBooking.scheduled_at).toLocaleDateString('ja-JP', {
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                })}
              </p>
              <p className="mt-0.5 text-base text-[#6B7280]">
                {new Date(nextBooking.scheduled_at).toLocaleTimeString('ja-JP', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-[16px] px-4 py-4 border border-[#E5E7EB] flex items-center justify-between gap-4">
              <p className="text-sm text-[#6B7280]">まだ予約がありません</p>
              <Link
                href="/trainee/booking"
                className="shrink-0 h-11 px-4 bg-[#0A0A0A] text-white text-sm font-bold rounded-full active:scale-[0.98] transition-transform"
              >
                予約する
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 体重推移グラフ */}
      <div>
        <h2 className="text-base font-bold text-[#0A0A0A] mb-3">体重の推移</h2>
        <div className="bg-white rounded-[16px] p-4 border border-[#E5E7EB]">
          <BodyWeightChart data={bodyWeightData} />
          <div className="mt-4 border-t border-[#E5E7EB] pt-4">
            <BodyWeightInput />
          </div>
        </div>
      </div>

      {/* 最近の記録 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-[#0A0A0A]">最近の記録</h2>
          <Link
            href="/trainee/history"
            className="text-sm font-semibold text-[#0066FF]"
          >
            すべて見る
          </Link>
        </div>
        {!logSummary.length ? (
          <div className="bg-white rounded-[16px] p-6 text-center text-sm text-[#9CA3AF] border border-[#E5E7EB]">
            まだありません。上のボタンから記録を始められます
          </div>
        ) : (
          <div className="space-y-2">
            {logSummary.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-[16px] px-4 py-4 border border-[#E5E7EB]"
              >
                <p className="text-sm font-bold text-[#0A0A0A]">
                  {new Date(log.logged_at).toLocaleDateString('ja-JP', {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short',
                  })}
                </p>
                <p className="mt-1 text-sm text-[#6B7280] leading-snug">
                  {log.exerciseNames.slice(0, 3).join(' · ')}
                  {log.exerciseNames.length > 3 && ' …'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
