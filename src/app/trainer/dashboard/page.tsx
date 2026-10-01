import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { signOutAction } from '@/app/auth/login/actions'
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
  pending: 'border-[#0A0A0A] bg-white text-[#0A0A0A]',
  confirmed: 'border-[#12C7BE] bg-[#12C7BE] text-white',
  cancelled: 'border-[#DDE8E8] bg-[#F4F7F7] text-[#555555]',
  completed: 'border-[#0A0A0A] bg-[#0A0A0A] text-white',
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
  name,
  monthLabel,
  todayLabel,
  totalSales,
  clientCount,
  pendingCount,
  todayBookings,
  preview = false,
}: {
  name: string
  monthLabel: string
  todayLabel: string
  totalSales: number
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
        <div className="w-10" />
        <h1 className="flex-1 text-center text-[17px] font-black text-[#0A0A0A]">ホーム</h1>
        {preview ? (
          <div className="w-10" />
        ) : (
          <form action={signOutAction} className="flex w-10 justify-end">
            <button
              type="submit"
              className="fitall-focus-ring flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#0A0A0A] text-xs font-black text-white"
              aria-label="ログアウト"
            >
              {name[0] ?? 'T'}
            </button>
          </form>
        )}
      </div>

      <div className="fitall-page-pad space-y-5">
        {preview && (
          <div className="fitall-card bg-[#E8FBFA] px-4 py-3 text-xs font-black leading-relaxed text-[#087D78]">
            開発用UI確認モードです。ログインなしで表示しています。
          </div>
        )}

        <section className="fitall-card-strong fitall-card-pop overflow-hidden">
          <div className="fitall-table-head flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-[10px] font-black tracking-[0.12em] text-white/70">TODAY</p>
              <h2 className="mt-1 text-lg font-black text-white">{todayLabel}</h2>
            </div>
            <span className="rounded-[4px] bg-[#12C7BE] px-3 py-1 text-xs font-black text-white">
              {todayBookings.length}件
            </span>
          </div>
          <div className="px-4 py-4">
            <p className="fitall-kicker">NEXT SESSION</p>
            {nextBooking ? (
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[34px] font-black leading-none text-[#0A0A0A]">
                    {formatTime(nextBooking.scheduled_at)}
                  </p>
                  <p className="mt-2 text-sm font-black text-[#0A0A0A]">
                    {nextBooking.trainee_name}
                  </p>
                </div>
                <span className={`rounded-[4px] border px-2.5 py-1 text-[11px] font-black ${statusBadge[nextBooking.status] ?? statusBadge.confirmed}`}>
                  {statusLabel[nextBooking.status] ?? nextBooking.status}
                </span>
              </div>
            ) : (
              <div className="mt-3 rounded-[6px] border-2 border-dashed border-[#DDE8E8] px-4 py-5 text-center">
                <p className="text-sm font-black text-[#0A0A0A]">今日は予約なし</p>
                <p className="mt-1 text-xs font-bold text-[#555555]">リンク共有や空き枠の整理に使えます</p>
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2">
          <Link href="/trainer/sales" className="fitall-card fitall-tap fitall-rail col-span-2 p-3">
            <p className="text-[10px] font-black text-[#555555]">今月売上</p>
            <p className="mt-2 text-3xl font-black leading-none text-[#0A0A0A]">{yen(totalSales)}</p>
            <p className="mt-1 text-[10px] font-bold text-[#087D78]">{monthLabel}</p>
          </Link>
          <Link href="/trainer/clients" className="fitall-card fitall-tap fitall-rail p-3">
            <p className="text-[10px] font-black text-[#555555]">顧客</p>
            <p className="mt-2 text-2xl font-black text-[#0A0A0A]">{clientCount}<span className="ml-0.5 text-xs">名</span></p>
            <p className="mt-1 text-[10px] font-bold text-[#087D78]">管理中</p>
          </Link>
          <Link href="/trainer/bookings" className="fitall-card fitall-tap fitall-rail relative p-3">
            <p className="text-[10px] font-black text-[#555555]">承認待ち</p>
            <p className="mt-2 text-2xl font-black text-[#0A0A0A]">{pendingCount}<span className="ml-0.5 text-xs">件</span></p>
            <p className="mt-1 text-[10px] font-bold text-[#087D78]">確認</p>
            {pendingCount > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#12C7BE]" />}
          </Link>
        </section>

        <section className="fitall-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="fitall-section-title">今日の流れ</h2>
            <Link href="/trainer/bookings" className="text-xs font-black text-[#087D78]">
              カレンダー
            </Link>
          </div>

          {!todayBookings.length ? (
            <div className="rounded-[6px] bg-[#F4F7F7] px-4 py-4">
              <p className="text-sm font-black text-[#0A0A0A]">予定は空いています</p>
              <p className="mt-1 text-xs font-bold leading-relaxed text-[#555555]">
                お客様にマイページ登録リンクを送ると、決済済みの予約がここに並びます。
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#DDE8E8]">
              {todayBookings.map((booking) => (
                <Link
                  key={booking.id}
                  href="/trainer/bookings"
                  className="grid grid-cols-[58px_1fr_auto] items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="rounded-[4px] bg-[#E8FBFA] px-2 py-2 text-center text-sm font-black text-[#087D78]">
                    {formatTime(booking.scheduled_at)}
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#0A0A0A]">{booking.trainee_name}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-[#555555]">
                      {statusLabel[booking.status] ?? booking.status}
                    </p>
                  </div>
                  <span className="text-lg font-black text-[#A8B2B2]">›</span>
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
            <p className="mt-2 text-sm font-bold text-[#555555]">
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
          <div className="fitall-desktop-card mb-5 bg-[#E8FBFA] px-5 py-3 text-sm font-black text-[#087D78]">
            開発用UI確認モードです。ログインなしで表示しています。
          </div>
        )}

        <section className="grid grid-cols-[1.35fr_1fr_1fr] gap-4">
          <div className="fitall-desktop-card border-[#0A0A0A]">
            <div className="fitall-table-head flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-[10px] font-black tracking-[0.12em] text-white/70">NEXT SESSION</p>
                <p className="mt-1 text-lg font-black text-white">次のセッション</p>
              </div>
              <span className="rounded-[4px] bg-[#12C7BE] px-3 py-1 text-xs font-black text-white">
                {todayBookings.length}件
              </span>
            </div>
            <div className="p-6">
              {nextBooking ? (
                <div className="flex items-end justify-between gap-6">
                  <div>
                    <p className="text-[56px] font-black leading-none text-[#0A0A0A]">
                      {formatTime(nextBooking.scheduled_at)}
                    </p>
                    <p className="mt-3 text-xl font-black text-[#0A0A0A]">
                      {nextBooking.trainee_name}
                    </p>
                  </div>
                  <span className={`rounded-[4px] border px-3 py-1.5 text-xs font-black ${statusBadge[nextBooking.status] ?? statusBadge.confirmed}`}>
                    {statusLabel[nextBooking.status] ?? nextBooking.status}
                  </span>
                </div>
              ) : (
                <div className="rounded-[6px] border-2 border-dashed border-[#DDE8E8] px-5 py-8 text-center">
                  <p className="text-base font-black text-[#0A0A0A]">今日は予約なし</p>
                <p className="mt-1 text-sm font-bold text-[#555555]">登録リンクや空き枠を整えられます</p>
                </div>
              )}
            </div>
          </div>

          <Link href="/trainer/sales" className="fitall-desktop-card fitall-tap p-5">
            <p className="fitall-kicker">SALES</p>
            <p className="mt-5 text-4xl font-black text-[#0A0A0A]">{yen(totalSales)}</p>
            <p className="mt-2 text-sm font-black text-[#087D78]">{monthLabel}の売上</p>
          </Link>

          <div className="grid gap-4">
            <Link href="/trainer/clients" className="fitall-desktop-card fitall-tap p-5">
              <p className="text-xs font-black text-[#555555]">顧客</p>
              <p className="mt-2 text-4xl font-black text-[#0A0A0A]">{clientCount}<span className="ml-1 text-base">名</span></p>
            </Link>
            <Link href="/trainer/bookings" className="fitall-desktop-card fitall-tap relative p-5">
              <p className="text-xs font-black text-[#555555]">承認待ち</p>
              <p className="mt-2 text-4xl font-black text-[#0A0A0A]">{pendingCount}<span className="ml-1 text-base">件</span></p>
              {pendingCount > 0 && <span className="absolute right-5 top-5 h-3 w-3 rounded-full bg-[#12C7BE]" />}
            </Link>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-[1.2fr_.8fr] gap-4">
          <div className="fitall-desktop-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="fitall-section-title">今日のスケジュール</h2>
              <Link href="/trainer/bookings" className="text-sm font-black text-[#087D78]">予約管理へ</Link>
            </div>
            {!todayBookings.length ? (
              <div className="rounded-[6px] bg-[#F4F7F7] px-5 py-6 text-sm font-bold text-[#555555]">
                今日の予約はありません。
              </div>
            ) : (
              <div className="divide-y divide-[#DDE8E8]">
                {todayBookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href="/trainer/bookings"
                    className="grid grid-cols-[90px_1fr_120px] items-center gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="rounded-[4px] bg-[#E8FBFA] px-3 py-2 text-center text-base font-black text-[#087D78]">
                      {formatTime(booking.scheduled_at)}
                    </div>
                    <div>
                      <p className="text-base font-black text-[#0A0A0A]">{booking.trainee_name}</p>
                      <p className="mt-1 text-xs font-bold text-[#555555]">セッション予約</p>
                    </div>
                    <span className={`justify-self-end rounded-[4px] border px-3 py-1 text-xs font-black ${statusBadge[booking.status] ?? statusBadge.confirmed}`}>
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
        name="Trainer"
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

  const { data: userData } = await supabase
    .from('users')
    .select('name')
    .eq('id', user!.id)
    .maybeSingle()

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

  const { data: salesData } = await supabase
    .from('sales_records')
    .select('amount')
    .in('trainer_id', trainerIdsForQuery)
    .gte('paid_at', monthStart.toISOString())

  const totalSales = (salesData ?? []).reduce((sum, r) => sum + r.amount, 0)

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
      name={userData?.name ?? 'Trainer'}
      monthLabel={monthLabel}
      todayLabel={todayLabel}
      totalSales={totalSales}
      clientCount={clientCount ?? 0}
      pendingCount={pendingCount ?? 0}
      todayBookings={(todayBookings ?? []).map((booking) => ({
        ...booking,
        trainee_name: traineeMap[booking.trainee_id] ?? '不明',
      }))}
    />
  )
}
