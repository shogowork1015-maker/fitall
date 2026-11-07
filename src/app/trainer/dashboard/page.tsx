import { loadTrainerRevenue, trainerRevenueErrorMessage } from '@/lib/trainer-revenue'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { loadTraineeNameMap } from '@/lib/trainee-display'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'
import {
  formatJstDate,
  formatJstDateKey,
  formatJstTime,
  jstDayBounds,
  jstMonthBounds,
  parseJstDateTime,
} from '@/lib/datetime'

type DashboardBooking = {
  id: string
  scheduled_at: string
  status: string
  trainee_id: string
  trainee_name: string
}

const statusLabel: Record<string, string> = {
  pending: '承認待ち',
  confirmed: '確定',
  cancelled: 'キャンセル',
  completed: '完了',
}

const statusBadge: Record<string, string> = {
  pending: 'border-ink bg-white text-ink',
  confirmed: 'border-accent bg-accent text-ink',
  cancelled: 'border-line bg-surface-soft text-ink-muted',
  completed: 'border-ink bg-ink text-white',
}

function formatTime(dateStr: string) {
  return formatJstTime(dateStr, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function yen(amount: number) {
  return `¥${amount.toLocaleString()}`
}

function DashboardScreen({
  monthLabel,
  todayLabel,
  totalSales,
  salesError,
  clientCount,
  pendingCount,
  todayBookings,
  preview = false,
}: {
  monthLabel: string
  todayLabel: string
  totalSales: number | null
  salesError?: string
  clientCount: number
  pendingCount: number
  todayBookings: DashboardBooking[]
  preview?: boolean
}) {
  const nextBooking = todayBookings[0]

  return (
    <>
    <div className="fitall-mobile-ui fitall-page fitall-scroll">
      <div className="fitall-topbar">
        <div className="w-14" />
        <h1 className="flex-1 text-center text-[17px] font-black text-ink">ホーム</h1>
        <Link href="/trainer/settings" aria-label="設定" className="w-14 text-ink-muted">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.8 1.17V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-2.8-1.17l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3 14H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 8.2l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 10 4.09V4a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 2.8 1.17l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 21 10h.09a2 2 0 1 1 0 4H21a1.65 1.65 0 0 0-1.6 1Z" />
          </svg>
        </Link>
      </div>

      <div className="fitall-page-pad space-y-5">
        {preview && (
          <div className="fitall-card bg-accent-soft px-4 py-3 text-base font-bold leading-relaxed text-brand">
            開発用UI確認モードです。ログインなしで表示しています。
          </div>
        )}

        <section className="fitall-card-strong overflow-hidden">
          <div className="fitall-table-head flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-base font-bold text-white/70">今日</p>
              <h2 className="mt-1 text-lg font-black text-white">{todayLabel}</h2>
            </div>
            <span className="rounded-chip bg-accent px-3 py-1 text-base font-bold text-ink">
              {todayBookings.length}件
            </span>
          </div>
          <div className="px-4 py-4">
            <p className="fitall-kicker">次の予約</p>
            {nextBooking ? (
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[34px] font-black leading-none text-ink">
                    {formatTime(nextBooking.scheduled_at)}
                  </p>
                  <p className="mt-2 text-base font-bold text-ink">
                    {nextBooking.trainee_name}
                  </p>
                </div>
                <span className={`rounded-chip border px-2.5 py-1 text-base font-bold ${statusBadge[nextBooking.status] ?? statusBadge.confirmed}`}>
                  {statusLabel[nextBooking.status] ?? nextBooking.status}
                </span>
              </div>
            ) : (
              <div className="mt-3 rounded-control border border-dashed border-line px-4 py-5 text-center">
                <p className="text-base font-bold text-ink">今日は予約なし</p>
                <p className="mt-1 text-base font-medium text-ink-muted">リンク共有や空き枠の整理に使えます</p>
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2">
          <Link href="/trainer/sales" className="fitall-card fitall-tap col-span-2 p-3">
            <p className="text-base font-medium text-ink-muted">今月売上</p>
            <p className="mt-2 text-3xl font-black leading-none text-ink">{totalSales === null ? '—' : yen(totalSales)}</p>
            <p className="mt-1 text-base font-bold text-brand">{monthLabel}</p>
            {salesError && <p role="status" className="mt-2 text-base leading-relaxed text-ink-muted">{salesError}</p>}
          </Link>
          <Link href="/trainer/clients" className="fitall-card fitall-tap p-3">
            <p className="text-base font-medium text-ink-muted">お客様</p>
            <p className="mt-2 text-2xl font-black text-ink">{clientCount}<span className="ml-0.5 text-base">名</span></p>
            <p className="mt-1 text-base font-bold text-brand">管理中</p>
          </Link>
          <Link href="/trainer/bookings" className="fitall-card fitall-tap relative p-3">
            <p className="text-base font-medium text-ink-muted">承認待ち</p>
            <p className="mt-2 text-2xl font-black text-ink">{pendingCount}<span className="ml-0.5 text-base">件</span></p>
            <p className="mt-1 text-base font-bold text-brand">確認</p>
            {pendingCount > 0 && <span aria-hidden="true" className="fitall-pop absolute right-3 top-3 h-3 w-3 rounded-full bg-accent" />}
          </Link>
        </section>

        <section className="fitall-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="fitall-section-title">今日の流れ</h2>
            <Link href="/trainer/bookings" className="inline-flex min-h-14 items-center px-1 font-bold text-brand">
              カレンダー
            </Link>
          </div>

          {!todayBookings.length ? (
            <div className="rounded-control bg-surface-soft px-4 py-4">
              <p className="text-base font-bold text-ink">予定は空いています</p>
              <p className="mt-1 text-base font-medium leading-relaxed text-ink-muted">
                お客様にマイページ登録リンクを送ると、決済済みの予約がここに並びます。
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {todayBookings.map((booking) => (
                <Link
                  key={booking.id}
                  href="/trainer/bookings"
                  className="grid min-h-14 grid-cols-[72px_1fr_auto] items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="rounded-chip bg-accent-soft px-2 py-2 text-center text-base font-bold text-brand">
                    {formatTime(booking.scheduled_at)}
                  </div>
                  <div>
                    <p className="text-base font-bold text-ink">{booking.trainee_name}</p>
                    <p className="mt-0.5 text-base font-medium text-ink-muted">
                      {statusLabel[booking.status] ?? booking.status}
                    </p>
                  </div>
                  <span className="text-lg font-black text-ink-faint">›</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Link href="/trainer/invite" className="fitall-aqua-action fitall-tap">
            登録リンクを送る
          </Link>
          <Link href="/trainer/availability" className="fitall-secondary-action fitall-tap">
            空き枠を設定
          </Link>
        </section>
      </div>
    </div>
    <div className="fitall-desktop-ui fitall-desktop-page">
      <div className="fitall-desktop-container">
        <header className="fitall-desktop-header flex-wrap">
          <div>
            <p className="fitall-kicker">{todayLabel}</p>
            <h1 className="fitall-desktop-title">ホーム</h1>
            <p className="mt-2 text-base font-medium text-ink-muted">
              今日の予約、売上、承認待ちをまとめて確認できます。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/trainer/invite" className="fitall-aqua-action fitall-tap !w-auto shrink-0 whitespace-nowrap">
              登録リンクを送る
            </Link>
            <Link href="/trainer/bookings" className="fitall-secondary-action fitall-tap shrink-0 whitespace-nowrap">
              カレンダー
            </Link>
          </div>
        </header>

        {preview && (
          <div className="fitall-desktop-card mb-5 bg-accent-soft px-5 py-3 text-base font-bold text-brand">
            開発用UI確認モードです。ログインなしで表示しています。
          </div>
        )}

        <section className="grid grid-cols-[1.2fr_1fr_.8fr] gap-4">
          <div className="fitall-desktop-card border-ink">
            <div className="fitall-table-head flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-base font-bold text-white/70">次の予約</p>
                <p className="mt-1 text-lg font-black text-white">次のセッション</p>
              </div>
              <span className="rounded-chip bg-accent px-3 py-1 text-base font-bold text-ink">
                {todayBookings.length}件
              </span>
            </div>
            <div className="p-6">
              {nextBooking ? (
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-5xl font-black leading-none text-ink">
                      {formatTime(nextBooking.scheduled_at)}
                    </p>
                    <p className="mt-3 text-xl font-black text-ink">
                      {nextBooking.trainee_name}
                    </p>
                  </div>
                  <span className={`rounded-chip border px-3 py-1.5 text-base font-bold ${statusBadge[nextBooking.status] ?? statusBadge.confirmed}`}>
                    {statusLabel[nextBooking.status] ?? nextBooking.status}
                  </span>
                </div>
              ) : (
                <div className="rounded-control border border-dashed border-line px-5 py-8 text-center">
                  <p className="text-base font-black text-ink">今日は予約なし</p>
                <p className="mt-1 text-base font-medium text-ink-muted">登録リンクや空き枠を整えられます</p>
                </div>
              )}
            </div>
          </div>

          <Link href="/trainer/sales" className="fitall-desktop-card fitall-tap p-5">
            <p className="fitall-kicker">売上</p>
            <p className="mt-5 whitespace-nowrap text-3xl font-black text-ink">{totalSales === null ? '—' : yen(totalSales)}</p>
            <p className="mt-2 text-base font-bold text-brand">{monthLabel}の売上</p>
            {salesError && <p role="status" className="mt-2 text-base leading-relaxed text-ink-muted">{salesError}</p>}
          </Link>

          <div className="grid gap-4">
            <Link href="/trainer/clients" className="fitall-desktop-card fitall-tap p-5">
              <p className="text-base font-medium text-ink-muted">お客様</p>
              <p className="mt-2 text-4xl font-black text-ink">{clientCount}<span className="ml-1 text-base">名</span></p>
            </Link>
            <Link href="/trainer/bookings" className="fitall-desktop-card fitall-tap relative p-5">
              <p className="text-base font-medium text-ink-muted">承認待ち</p>
              <p className="mt-2 text-4xl font-black text-ink">{pendingCount}<span className="ml-1 text-base">件</span></p>
              {pendingCount > 0 && <span className="absolute right-5 top-5 h-3 w-3 rounded-full bg-accent" />}
            </Link>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-[1.2fr_.8fr] gap-4">
          <div className="fitall-desktop-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="fitall-section-title">今日のスケジュール</h2>
              <Link href="/trainer/bookings" className="text-base font-bold text-brand">予約管理へ</Link>
            </div>
            {!todayBookings.length ? (
              <div className="rounded-control bg-surface-soft px-5 py-6 text-base font-medium text-ink-muted">
                今日の予約はありません。
              </div>
            ) : (
              <div className="divide-y divide-line">
                {todayBookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href="/trainer/bookings"
                    className="grid grid-cols-[90px_1fr_120px] items-center gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="rounded-chip bg-accent-soft px-3 py-2 text-center text-base font-black text-brand">
                      {formatTime(booking.scheduled_at)}
                    </div>
                    <div>
                      <p className="text-base font-black text-ink">{booking.trainee_name}</p>
                      <p className="mt-1 text-base font-medium text-ink-muted">セッション予約</p>
                    </div>
                    <span className={`justify-self-end rounded-chip border px-3 py-1 text-base font-bold ${statusBadge[booking.status] ?? statusBadge.confirmed}`}>
                      {statusLabel[booking.status] ?? booking.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="fitall-desktop-card p-5">
            <h2 className="fitall-section-title">次にやること</h2>
            <div className="mt-4 space-y-3">
              <Link href="/trainer/invite" className="fitall-aqua-action fitall-tap">
                お客様に登録リンクを送る
              </Link>
              <Link href="/trainer/availability" className="fitall-secondary-action fitall-tap">
                空き枠を設定する
              </Link>
              <Link href="/trainer/settings" className="fitall-secondary-action fitall-tap">
                料金メニューを確認
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
    </>
  )
}

export default async function TrainerDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const devAuthBypass = isDevAuthBypassEnabled()

  if (!user && !devAuthBypass) redirect('/auth/login')

  const todayKey = formatJstDateKey()
  const todayLabel = formatJstDate(parseJstDateTime(todayKey, '00:00'), {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  })
  const monthLabel = formatJstDate(parseJstDateTime(todayKey, '00:00'), { month: 'numeric' })

  if (!user && devAuthBypass) {
    return (
      <DashboardScreen
        monthLabel={monthLabel}
        todayLabel={todayLabel}
        totalSales={128000}
        clientCount={12}
        pendingCount={1}
        todayBookings={[
          {
            id: 'preview-1',
            scheduled_at: parseJstDateTime(todayKey, '10:00').toISOString(),
            status: 'confirmed',
            trainee_id: 'preview-client-1',
            trainee_name: '佐藤さん',
          },
          {
            id: 'preview-2',
            scheduled_at: parseJstDateTime(todayKey, '13:00').toISOString(),
            status: 'pending',
            trainee_id: 'preview-client-2',
            trainee_name: '田中さん',
          },
          {
            id: 'preview-3',
            scheduled_at: parseJstDateTime(todayKey, '18:00').toISOString(),
            status: 'confirmed',
            trainee_id: 'preview-client-3',
            trainee_name: '山本さん',
          },
        ]}
        preview
      />
    )
  }

  const { data: myTrainerProfile } = await supabase
    .from('trainer_profiles')
    .select('id')
    .eq('user_id', user!.id)
    .maybeSingle()

  const trainerIdsForQuery = [user!.id, myTrainerProfile?.id].filter(Boolean) as string[]

  const { start: todayStart, end: todayEnd } = jstDayBounds(todayKey)
  const { start: monthStart } = jstMonthBounds(todayKey)

  const { data: todayBookings } = await supabase
    .from('bookings')
    .select('id, scheduled_at, status, trainee_id')
    .in('trainer_id', trainerIdsForQuery)
    .gte('scheduled_at', todayStart.toISOString())
    .lte('scheduled_at', todayEnd.toISOString())
    .order('scheduled_at')

  const traineeMap = await loadTraineeNameMap(
    supabase,
    (todayBookings ?? []).map((b) => b.trainee_id)
  )

  const { end: monthEnd } = jstMonthBounds(todayKey)
  let totalSales: number | null = null
  let salesError: string | undefined
  try {
    const salesData = await loadTrainerRevenue(supabase, trainerIdsForQuery, monthStart.toISOString(), monthEnd.toISOString())
    totalSales = salesData.reduce((sum, r) => sum + r.amount, 0)
  } catch (error) {
    salesError = trainerRevenueErrorMessage(error)
  }

  const { count: clientCount } = myTrainerProfile
    ? await supabase
        .from('trainer_trainee')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', myTrainerProfile.id)
        .eq('status', 'active')
    : { count: 0 }

  const { count: pendingCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .in('trainer_id', trainerIdsForQuery)
    .eq('status', 'pending')

  return (
    <DashboardScreen
            monthLabel={monthLabel}
      todayLabel={todayLabel}
      totalSales={totalSales}
      salesError={salesError}
      clientCount={clientCount ?? 0}
      pendingCount={pendingCount ?? 0}
      todayBookings={(todayBookings ?? []).map((booking) => ({
        ...booking,
        trainee_name: traineeMap[booking.trainee_id] ?? '不明',
      }))}
    />
  )
}
