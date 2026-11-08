import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { BodyWeightChart } from '@/components/charts/BodyWeightChart'
import { ExerciseWeightChart, type ExerciseChartData } from '@/components/charts/ExerciseWeightChart'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'
import { formatJstDate, formatJstDateTime } from '@/lib/datetime'
import { DevPreviewNote, PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { CalendarIcon, LinkIcon, TicketIcon } from '@/components/ui/Icons'

// お客様の顔となる見出しカード。連絡先アプリのように頭文字・名前・よく使う操作を並べる
function ClientProfileCard({ name, email }: { name: string; email: string }) {
  const actions = [
    { href: '/trainer/bookings', label: '予約', Icon: CalendarIcon },
    { href: '/trainer/settings', label: 'メニュー', Icon: TicketIcon },
    { href: '/trainer/invite', label: '登録リンク', Icon: LinkIcon },
  ]
  return (
    <section className="fitall-card px-4 pb-4 pt-6 text-center">
      <span className="fitall-avatar mx-auto !h-20 !w-20 !text-3xl">{name[0] ?? '?'}</span>
      <h2 className="mt-3 break-words text-2xl font-bold text-ink">{name}</h2>
      <p className="mt-1 break-all text-base text-ink-muted">{email}</p>
      <div className="mt-5 grid grid-cols-3 gap-2">
        {actions.map(({ href, label, Icon }) => (
          <Link key={label} href={href} className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-control bg-surface-soft text-brand">
            <Icon />
            <span className="text-base font-semibold">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function ClientDetailHeader() {
  return (
    <PageHeader title="お客様" back={{ href: '/trainer/clients', label: 'お客様一覧へ戻る' }} />
  )
}

// 左に項目名、右に値を置く1行
function ValueRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="fitall-row">
      <span className="fitall-row-main text-base text-ink-muted">{label}</span>
      <span className="text-right text-base font-semibold text-ink">{value}</span>
    </div>
  )
}

function PreviewClientDetailPage({ id }: { id: string }) {
  const previewClients: Record<string, { name: string; email: string; credits: number; goal: string }> = {
    'preview-1': { name: '佐藤さん', email: 'sato@example.com', credits: 2, goal: '週2回で筋力アップ' },
    'preview-2': { name: '田中さん', email: 'tanaka@example.com', credits: 4, goal: '姿勢改善と体力づくり' },
    'preview-3': { name: '山本さん', email: 'yamamoto@example.com', credits: 1, goal: '継続習慣を作る' },
  }
  const client = previewClients[id] ?? previewClients['preview-1']!

  return (
    <div className="fitall-page fitall-scroll">
      <ClientDetailHeader />
      <div className="fitall-page-pad mx-auto max-w-[720px] space-y-7">
        <DevPreviewNote>開発用の確認モード（サンプルのお客様）</DevPreviewNote>
        <ClientProfileCard name={client.name} email={client.email} />

        <section className="fitall-group">
          <ValueRow label="残りチケット" value={<span className="fitall-figure text-xl">{client.credits}<small>回</small></span>} />
          <ValueRow label="次回の予約" value="7/18 10:00" />
          <ValueRow label="目標" value={client.goal} />
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

  return (
    <div className="fitall-page fitall-scroll">
      <ClientDetailHeader />

      <div className="fitall-page-pad mx-auto max-w-[720px] space-y-7">
        <ClientProfileCard name={trainee?.name ?? 'お客様'} email={trainee?.email ?? 'メール未登録'} />

        <section>
          <h3 className="fitall-group-label">チケット</h3>
          <div className="fitall-card grid grid-cols-3 divide-x divide-line py-4 text-center">
            {[
              { label: '未消化', value: activeCredits },
              { label: '予約済み', value: creditSummary.scheduled },
              { label: '使用済み', value: creditSummary.used },
            ].map((item) => (
              <div key={item.label} className="px-2">
                <p className="fitall-figure text-[28px]">{item.value}<small>回</small></p>
                <p className="mt-1 text-base text-ink-muted">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="fitall-group-label">からだのデータ</h3>
          <div className="fitall-group">
            <ValueRow label="身長" value={profile?.height ? `${profile.height} cm` : '—'} />
            <ValueRow label="体重" value={profile?.weight ? `${profile.weight} kg` : '—'} />
            <ValueRow label="目標" value={profile?.goal ?? '—'} />
          </div>
        </section>

        {bodyWeightData.length > 0 && (
          <section>
            <h3 className="fitall-group-label">体重の推移</h3>
            <div className="fitall-card p-4">
              <BodyWeightChart data={bodyWeightData} />
            </div>
          </section>
        )}

        {exerciseChartData.length > 0 && (
          <section>
            <h3 className="fitall-group-label">種目ごとの重量</h3>
            <div className="fitall-card p-4">
              <ExerciseWeightChart exercises={exerciseChartData} />
            </div>
          </section>
        )}

        {!!logs?.length && (
          <section>
            <h3 className="fitall-group-label">最近のトレーニング</h3>
            <div className="fitall-group">
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
                  <div key={log.id} className="fitall-row !items-start">
                    <div className="fitall-row-main">
                      <p className="fitall-row-title">
                        {formatJstDate(log.logged_at, { month: 'long', day: 'numeric', weekday: 'short' })}
                      </p>
                      {Object.values(exerciseSummary).map((e) => (
                        <p key={e.name} className="fitall-row-meta">
                          <span>{e.name}</span>
                          <span>最大 {e.maxWeight}kg × {e.totalReps}回</span>
                        </p>
                      ))}
                      {log.memo && <p className="mt-2 text-base leading-relaxed text-ink-muted">{log.memo}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <section>
          <h3 className="fitall-group-label">予約の履歴</h3>
          {!bookings?.length ? (
            <div className="fitall-group px-5 py-5 text-base text-ink-muted">
              まだ予約がありません
            </div>
          ) : (
            <div className="fitall-group">
              {bookings.map((b) => (
                <div key={b.id} className="fitall-row" data-status={b.status}>
                  <div className="fitall-row-main">
                    <p className="fitall-row-title">
                      {formatJstDateTime(b.scheduled_at, { month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="fitall-row-meta"><span>¥{b.price.toLocaleString()}</span></p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
