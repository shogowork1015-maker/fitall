import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { BodyWeightChart } from '@/components/charts/BodyWeightChart'
import { ExerciseWeightChart, type ExerciseChartData } from '@/components/charts/ExerciseWeightChart'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'

function PreviewClientDetailPage({ id }: { id: string }) {
  const previewClients: Record<string, { name: string; email: string; credits: number; goal: string }> = {
    'preview-1': { name: '佐藤さん', email: 'sato@example.com', credits: 2, goal: '週2回で筋力アップ' },
    'preview-2': { name: '田中さん', email: 'tanaka@example.com', credits: 4, goal: '姿勢改善と体力づくり' },
    'preview-3': { name: '山本さん', email: 'yamamoto@example.com', credits: 1, goal: '継続習慣を作る' },
  }
  const client = previewClients[id] ?? previewClients['preview-1']!

  return (
    <div className="fitall-page fitall-scroll md:bg-[#F7FBFB]">
      <div className="fitall-topbar">
        <Link href="/trainer/clients" className="w-10 text-xs font-black text-[#087D78]">
          戻る
        </Link>
        <h1 className="flex-1 text-center text-[17px] font-black text-[#0A0A0A]">顧客詳細</h1>
        <div className="w-10" />
      </div>

      <div className="fitall-page-pad mx-auto max-w-[980px] space-y-5">
        <section className="fitall-card-strong overflow-hidden">
          <div className="bg-[#12C7BE] px-4 py-5 text-white md:px-5">
            <p className="text-[10px] font-black tracking-[0.12em] text-white/80">PREVIEW CUSTOMER</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[6px] bg-[#0A0A0A] text-xl font-black text-white">
                {client.name[0]}
              </div>
              <div className="min-w-0">
                <h2 className="break-words text-2xl font-black leading-tight">{client.name}</h2>
                <p className="mt-1 break-all text-xs font-bold text-white/85">{client.email}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-2 p-4 md:grid-cols-3">
            <Link href="/trainer/bookings" className="fitall-primary-action fitall-tap h-11 text-xs">
              予約を入れる
            </Link>
            <Link href="/trainer/settings" className="fitall-secondary-action fitall-tap h-11 text-xs">
              メニュー調整
            </Link>
            <Link href="/trainer/invite" className="fitall-secondary-action fitall-tap h-11 text-xs">
              登録リンクを送る
            </Link>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="fitall-card p-4">
            <p className="fitall-kicker">TICKET</p>
            <p className="mt-2 text-4xl font-black text-[#0A0A0A]">{client.credits}</p>
            <p className="mt-1 text-xs font-bold text-[#555555]">利用可能</p>
          </div>
          <div className="fitall-card p-4">
            <p className="fitall-kicker">NEXT</p>
            <p className="mt-2 text-lg font-black text-[#0A0A0A]">7/18 10:00</p>
            <p className="mt-1 text-xs font-bold text-[#555555]">次回予約</p>
          </div>
          <div className="fitall-card p-4">
            <p className="fitall-kicker">GOAL</p>
            <p className="mt-2 text-sm font-black leading-relaxed text-[#0A0A0A]">{client.goal}</p>
          </div>
        </section>

        <section className="fitall-card p-4">
          <h2 className="fitall-section-title">直近のメモ</h2>
          <div className="mt-3 space-y-2 text-sm font-bold leading-relaxed text-[#555555]">
            <p>フォーム確認用のプレビューです。実データの保存操作はありません。</p>
            <p>本番では予約履歴、チケット、トレーニング記録、身体データがここに紐づきます。</p>
          </div>
        </section>
      </div>
    </div>
  )
}

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

  if (!user && isDevAuthBypassEnabled()) return <PreviewClientDetailPage id={id} />
  if (!user) redirect('/auth/login')

  const { data: trainerProfile } = await supabase
    .from('trainer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: traineeProfileForCheck } = await supabase
    .from('trainee_profiles')
    .select('id')
    .eq('user_id', id)
    .maybeSingle()

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

  const { data: trainee } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', id)
    .maybeSingle()

  const { data: profile } = await supabase
    .from('trainee_profiles')
    .select('height, weight, goal')
    .eq('user_id', id)
    .maybeSingle()

  const { data: logs } = traineeProfileForCheck
    ? await supabase
        .from('workout_logs')
        .select('id, logged_at, memo')
        .eq('trainee_id', traineeProfileForCheck.id)
        .order('logged_at', { ascending: false })
        .limit(10)
    : { data: [] }

  const logIds = (logs ?? []).map((l) => l.id)

  const { data: sets } = logIds.length
    ? await supabase
        .from('workout_sets')
        .select('log_id, weight_kg, reps, exercise_id')
        .in('log_id', logIds)
    : { data: [] }

  const exerciseIds = [...new Set((sets ?? []).map((s) => s.exercise_id))]
  const { data: exercises } = exerciseIds.length
    ? await supabase.from('exercises').select('id, name').in('id', exerciseIds)
    : { data: [] }

  const exerciseMap = Object.fromEntries(
    (exercises ?? []).map((e) => [e.id, e.name])
  )

  type SetRow = { log_id: string; weight_kg: number; reps: number; exercise_id: string }

  const setsByLog = (sets ?? []).reduce<Record<string, SetRow[]>>(
    (acc, s) => {
      if (!acc[s.log_id]) acc[s.log_id] = []
      acc[s.log_id]!.push(s as SetRow)
      return acc
    },
    {}
  )

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

  const thirtyDaysAgo = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000)
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

  const { data: bookings } = trainerProfile && traineeProfileForCheck
    ? await supabase
        .from('bookings')
        .select('id, scheduled_at, status, price')
        .eq('trainer_id', trainerProfile.id)
        .eq('trainee_id', traineeProfileForCheck.id)
        .order('scheduled_at', { ascending: false })
        .limit(5)
    : { data: [] }

  const { data: creditRows } = trainerProfile && traineeProfileForCheck
    ? await supabase
        .from('session_credits')
        .select('status, booking_id')
        .eq('trainer_id', trainerProfile.id)
        .eq('trainee_id', traineeProfileForCheck.id)
    : { data: [] }

  const creditSummary = (creditRows ?? []).reduce(
    (acc, credit) => {
      const status = credit.status ?? 'available'
      if (status === 'available') acc.available += 1
      if (status === 'scheduled') acc.scheduled += 1
      if (status === 'used') acc.used += 1
      if (status === 'refunded') acc.refunded += 1
      if (status === 'expired') acc.expired += 1
      return acc
    },
    { available: 0, scheduled: 0, used: 0, refunded: 0, expired: 0 }
  )
  const activeCredits = creditSummary.available + creditSummary.scheduled

  const statusLabel: Record<string, string> = {
    pending: '承認待ち',
    confirmed: '確定',
    cancelled: 'キャンセル',
    completed: '完了',
  }

  const statusBadge: Record<string, string> = {
    pending: 'bg-white text-[#0A0A0A] border-[#0A0A0A]',
    confirmed: 'bg-[#12C7BE] text-white border-[#12C7BE]',
    cancelled: 'bg-[#F4F7F7] text-[#555555] border-[#DDE8E8]',
    completed: 'bg-[#0A0A0A] text-white border-[#0A0A0A]',
  }

  return (
    <div className="fitall-page fitall-scroll md:bg-[#F7FBFB]">
      <div className="fitall-topbar">
        <Link href="/trainer/clients" className="w-10 text-xs font-black text-[#087D78]">
          戻る
        </Link>
        <h1 className="flex-1 text-center text-[17px] font-black text-[#0A0A0A]">顧客詳細</h1>
        <div className="w-10" />
      </div>

      <div className="fitall-page-pad mx-auto max-w-[980px] space-y-5">
        <section className="fitall-card-strong overflow-hidden">
          <div className="bg-[#12C7BE] px-4 py-5 text-white md:px-5">
            <p className="text-[10px] font-black tracking-[0.12em] text-white/80">CUSTOMER</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[6px] bg-[#0A0A0A] text-xl font-black text-white">
                {trainee?.name?.[0] ?? '?'}
              </div>
              <div className="min-w-0">
                <h2 className="break-words text-2xl font-black leading-tight">{trainee?.name ?? 'お客様'}</h2>
                <p className="mt-1 break-all text-xs font-bold text-white/85">{trainee?.email ?? 'メール未登録'}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-2 p-4 md:grid-cols-3">
            <Link href="/trainer/bookings" className="fitall-primary-action fitall-tap h-11 text-xs">
              予約を入れる
            </Link>
            <Link href="/trainer/settings" className="fitall-secondary-action fitall-tap h-11 text-xs">
              メニュー調整
            </Link>
            <Link href="/trainer/invite" className="fitall-secondary-action fitall-tap h-11 text-xs">
              登録リンクを送る
            </Link>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between px-1">
            <h3 className="fitall-section-title">チケット</h3>
            <span className="text-xs font-black text-[#087D78]">未消化 {activeCredits}回</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="fitall-card p-4 text-center">
              <p className="text-[10px] font-black text-[#087D78]">未消化</p>
              <p className="text-xl font-black text-[#0A0A0A]">{activeCredits}</p>
              <p className="mt-1 text-[10px] font-black text-[#555555]">回</p>
            </div>
            <div className="fitall-card p-4 text-center">
              <p className="text-[10px] font-black text-[#087D78]">予約済み</p>
              <p className="text-xl font-black text-[#0A0A0A]">{creditSummary.scheduled}</p>
              <p className="mt-1 text-[10px] font-black text-[#555555]">回</p>
            </div>
            <div className="fitall-card p-4 text-center">
              <p className="text-[10px] font-black text-[#087D78]">使用済み</p>
              <p className="text-xl font-black text-[#0A0A0A]">{creditSummary.used}</p>
              <p className="mt-1 text-[10px] font-black text-[#555555]">回</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="fitall-section-title mb-3 px-1">身体データ</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="fitall-card p-4 text-center">
              <p className="text-[10px] font-black text-[#087D78]">身長</p>
              <p className="text-xl font-black text-[#0A0A0A]">
                {profile?.height ?? '-'}
              </p>
              <p className="mt-1 text-[10px] font-black text-[#555555]">cm</p>
            </div>
            <div className="fitall-card p-4 text-center">
              <p className="text-[10px] font-black text-[#087D78]">体重</p>
              <p className="text-xl font-black text-[#0A0A0A]">
                {profile?.weight ?? '-'}
              </p>
              <p className="mt-1 text-[10px] font-black text-[#555555]">kg</p>
            </div>
            <div className="fitall-card p-4 text-center">
              <p className="text-[10px] font-black text-[#087D78]">目標</p>
              <p className="mt-1 line-clamp-3 text-[10px] font-black text-[#0A0A0A]">{profile?.goal ?? '-'}</p>
            </div>
          </div>
        </section>

        {bodyWeightData.length > 0 && (
          <section className="fitall-card p-5">
            <h3 className="fitall-section-title mb-4">体重推移</h3>
            <BodyWeightChart data={bodyWeightData} />
          </section>
        )}

        {exerciseChartData.length > 0 && (
          <section className="fitall-card p-5">
            <h3 className="fitall-section-title mb-4">種目別重量推移</h3>
            <ExerciseWeightChart exercises={exerciseChartData} />
          </section>
        )}

        <section>
          <h3 className="fitall-section-title mb-3 px-1">最近のトレーニング</h3>
          {!logs?.length ? (
            <div className="fitall-card border-dashed p-6 text-center text-sm font-black text-[#555555]">
              まだ記録がありません
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const logSets = setsByLog[log.id] ?? []
                const exerciseSummary = logSets.reduce<
                  Record<string, { name: string; maxWeight: number; totalReps: number }>
                >((acc, s) => {
                  const name = exerciseMap[s.exercise_id] ?? '不明'
                  if (!acc[s.exercise_id]) {
                    acc[s.exercise_id] = { name, maxWeight: 0, totalReps: 0 }
                  }
                  acc[s.exercise_id]!.maxWeight = Math.max(acc[s.exercise_id]!.maxWeight, s.weight_kg)
                  acc[s.exercise_id]!.totalReps += s.reps
                  return acc
                }, {})

                return (
                  <div
                    key={log.id}
                    className="fitall-card p-4"
                  >
                    <p className="mb-3 text-sm font-black text-[#0A0A0A]">
                      {new Date(log.logged_at).toLocaleDateString('ja-JP', {
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short',
                      })}
                    </p>
                    <div className="space-y-2">
                      {Object.values(exerciseSummary).map((e) => (
                        <div key={e.name} className="flex justify-between gap-3 border-b border-[#DDE8E8] pb-2 text-sm last:border-0 last:pb-0">
                          <span className="font-black text-[#0A0A0A]">{e.name}</span>
                          <span className="text-right text-xs font-bold text-[#555555]">最大 {e.maxWeight}kg × {e.totalReps}reps</span>
                        </div>
                      ))}
                    </div>
                    {log.memo && (
                      <div className="mt-3 border-2 border-[#DDE8E8] bg-[#F4F7F7] p-3">
                        <p className="text-[11px] font-bold leading-relaxed text-[#555555]">{log.memo}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section>
          <h3 className="fitall-section-title mb-3 px-1">予約履歴</h3>
          {!bookings?.length ? (
            <div className="fitall-card border-dashed p-6 text-center text-sm font-black text-[#555555]">
              まだ予約がありません
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="fitall-card flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-black text-[#0A0A0A]">
                      {new Date(b.scheduled_at).toLocaleString('ja-JP', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-[#555555]">¥{b.price.toLocaleString()}</p>
                  </div>
                  <span className={`border px-2.5 py-1 text-[11px] font-black ${statusBadge[b.status] ?? 'bg-[#F4F7F7] text-[#555555] border-[#DDE8E8]'}`}>
                    {statusLabel[b.status] ?? b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
