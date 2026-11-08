import { loadTrainerRevenue, trainerRevenueErrorMessage } from '@/lib/trainer-revenue'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { loadTraineeNameMap } from '@/lib/trainee-display'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'
import { DevPreviewNote, HeaderAction, PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { CalendarIcon, ChevronRightIcon, ClockIcon, GearIcon, LinkIcon, PersonIcon } from '@/components/ui/Icons'
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
      <PageHeader
        title="ホーム"
        subtitle={todayLabel}
        actions={
          <HeaderAction href="/trainer/settings" label="設定">
            <GearIcon />
          </HeaderAction>
        }
      />

      <div className="fitall-page-pad space-y-7">
        {preview && <DevPreviewNote>開発用の確認モード（サンプル表示）</DevPreviewNote>}

        <section>
          <h2 className="fitall-group-label">
            <span>次の予約</span>
            <span className="font-medium">今日 {todayBookings.length}件</span>
          </h2>
          {nextBooking ? (
            <Link href="/trainer/bookings" className="fitall-card block p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="fitall-figure text-[44px]">{formatTime(nextBooking.scheduled_at)}</p>
                <StatusBadge status={nextBooking.status} />
              </div>
              <p className="mt-3 flex items-center gap-2 text-lg font-semibold text-ink">
                <PersonIcon className="text-ink-faint" />
                {nextBooking.trainee_name}
              </p>
            </Link>
          ) : (
            <div className="fitall-card px-5 py-6">
              <p className="text-lg font-semibold text-ink">今日は予約がありません</p>
              <p className="mt-1 text-base text-ink-muted">登録リンクの共有や、空き枠の調整に使えます。</p>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <Link href="/trainer/sales" className="fitall-card flex items-center gap-3 p-5">
            <div className="flex-1">
              <p className="text-base font-medium text-ink-muted">{monthLabel}の売上</p>
              <p className="fitall-figure mt-1 text-[34px]">{totalSales === null ? '—' : yen(totalSales)}</p>
              {salesError && <p role="status" className="mt-2 text-base leading-relaxed text-ink-muted">{salesError}</p>}
            </div>
            <ChevronRightIcon />
          </Link>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/trainer/clients" className="fitall-card block p-4">
              <p className="flex items-center gap-1.5 text-base font-medium text-ink-muted">
                <PersonIcon size={18} />お客様
              </p>
              <p className="fitall-figure mt-2 text-[28px]">{clientCount}<small>名</small></p>
            </Link>
            <Link href="/trainer/bookings" className="fitall-card relative block p-4">
              <p className="flex items-center gap-1.5 text-base font-medium text-ink-muted">
                <ClockIcon size={18} />承認待ち
              </p>
              <p className={`fitall-figure mt-2 text-[28px] ${pendingCount > 0 ? '!text-warn' : ''}`}>{pendingCount}<small>件</small></p>
              {pendingCount > 0 && <span aria-hidden="true" className="fitall-pop absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-[var(--fitall-warn-dot)]" />}
            </Link>
          </div>
        </section>

        <section>
          <h2 className="fitall-group-label">
            <span>今日の予定</span>
            <Link href="/trainer/bookings" className="inline-flex min-h-14 items-center">カレンダー</Link>
          </h2>
          {!todayBookings.length ? (
            <div className="fitall-group px-5 py-5">
              <p className="text-base font-semibold text-ink">予定は空いています</p>
              <p className="mt-1 text-base leading-relaxed text-ink-muted">
                お客様が予約すると、ここに時間順で並びます。
              </p>
            </div>
          ) : (
            <div className="fitall-group">
              {todayBookings.map((booking) => (
                <Link key={booking.id} href="/trainer/bookings" className="fitall-row" data-status={booking.status}>
                  <p className="fitall-figure w-14 text-[17px]">{formatTime(booking.scheduled_at)}</p>
                  <p className="fitall-row-main fitall-row-title">{booking.trainee_name}</p>
                  <StatusBadge status={booking.status} />
                  <ChevronRightIcon />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="fitall-group-label">すぐにできること</h2>
          <div className="fitall-group">
            <Link href="/trainer/invite" className="fitall-row">
              <span className="fitall-icon-tile" data-tone="accent"><LinkIcon /></span>
              <span className="fitall-row-main fitall-row-title">お客様に登録リンクを送る</span>
              <ChevronRightIcon />
            </Link>
            <Link href="/trainer/availability" className="fitall-row">
              <span className="fitall-icon-tile"><CalendarIcon /></span>
              <span className="fitall-row-main fitall-row-title">空き枠を設定する</span>
              <ChevronRightIcon />
            </Link>
          </div>
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
          <div className="mb-5"><DevPreviewNote>開発用の確認モード。ログインなしで表示しています。</DevPreviewNote></div>
        )}

        <section className="grid grid-cols-[1.2fr_1fr_.8fr] gap-4">
          <div className="fitall-desktop-card">
            <div className="flex items-center justify-between px-6 pt-5">
              <p className="text-base font-semibold text-ink-muted">次の予約</p>
              <span className="fitall-badge">今日 {todayBookings.length}件</span>
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
                  <StatusBadge status={nextBooking.status} />
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
                    <div className="fitall-figure text-lg">
                      {formatTime(booking.scheduled_at)}
                    </div>
                    <div>
                      <p className="text-base font-black text-ink">{booking.trainee_name}</p>
                      <p className="mt-1 text-base font-medium text-ink-muted">セッション予約</p>
                    </div>
                    <span className="justify-self-end"><StatusBadge status={booking.status} /></span>
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
