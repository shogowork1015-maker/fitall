import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TrainerBookingCalendar } from './TrainerBookingCalendar'
import { loadTraineeNameMap } from '@/lib/trainee-display'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function atHour(date: Date, hour: number) {
  const d = new Date(date)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

function mockCalendarData() {
  const today = new Date()
  const tomorrow = addDays(today, 1)
  const inThreeDays = addDays(today, 3)
  const nextWeek = addDays(today, 7)

  return {
    bookings: [
      {
        id: 'preview-booking-1',
        scheduled_at: atHour(today, 10),
        trainee_id: 'preview-client-1',
        trainee_name: '佐藤さん',
        price: 8800,
        status: 'confirmed' as const,
        credit_status: 'scheduled',
      },
      {
        id: 'preview-booking-2',
        scheduled_at: atHour(tomorrow, 13),
        trainee_id: 'preview-client-2',
        trainee_name: '田中さん',
        price: 8800,
        status: 'pending' as const,
        credit_status: null,
      },
      {
        id: 'preview-booking-3',
        scheduled_at: atHour(inThreeDays, 18),
        trainee_id: 'preview-client-3',
        trainee_name: '山本さん',
        price: 32000,
        status: 'confirmed' as const,
        credit_status: 'scheduled',
      },
      {
        id: 'preview-booking-4',
        scheduled_at: atHour(nextWeek, 11),
        trainee_id: 'preview-client-1',
        trainee_name: '佐藤さん',
        price: 8800,
        status: 'completed' as const,
        credit_status: 'used',
      },
    ],
    clients: [
      { trainee_id: 'preview-client-1', name: '佐藤さん' },
      { trainee_id: 'preview-client-2', name: '田中さん' },
      { trainee_id: 'preview-client-3', name: '山本さん' },
    ],
    menus: [
      { id: 'preview-menu-1', name: '通常セッション', price: 8800 },
      { id: 'preview-menu-4', name: '4回チケット', price: 32000 },
    ],
  }
}

export default async function TrainerBookingsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const devAuthBypass = isDevAuthBypassEnabled()

  if (!user && !devAuthBypass) redirect('/auth/login')

  if (!user && devAuthBypass) {
    const mock = mockCalendarData()
    return (
      <div className="fitall-page fitall-scroll md:bg-[#F7FBFB]">
        <div className="fitall-mobile-ui fitall-topbar">
          <div className="w-10" />
          <h1 className="text-[17px] font-black text-[#0A0A0A] flex-1 text-center">予約</h1>
          <Link href="/trainer/invite" className="w-10 text-right text-xs font-black text-[#087D78]">
            送る
          </Link>
        </div>

        <div className="hidden px-8 pt-8 md:block">
          <div className="fitall-desktop-container">
            <header className="fitall-desktop-header">
              <div>
                <p className="fitall-kicker">CALENDAR</p>
                <h1 className="fitall-desktop-title">予約管理</h1>
                <p className="mt-2 text-sm font-bold text-[#555555]">PCでは週・月カレンダーを広く見ながら予約を管理できます。</p>
              </div>
              <div className="flex gap-3">
                <Link href="/trainer/invite" className="fitall-aqua-action fitall-tap w-auto min-w-[170px]">リンク送信</Link>
                <Link href="/trainer/availability" className="fitall-secondary-action fitall-tap min-w-[150px]">空き設定</Link>
              </div>
            </header>
          </div>
        </div>

        <div className="px-4 pt-4 md:px-8 md:pt-0">
          <div className="fitall-desktop-container">
          <div className="fitall-card bg-[#E8FBFA] px-4 py-3 text-xs font-black leading-relaxed text-[#087D78]">
            開発用UI確認モードです。ログインなしで表示しています。予約作成・移動・完了などの保存は実行されません。
          </div>
          </div>
        </div>

        <div className="px-4 py-6 md:px-8">
          <div className="fitall-desktop-container">
          <TrainerBookingCalendar
            bookings={mock.bookings}
            clients={mock.clients}
            menus={mock.menus}
            preview
          />
          </div>
        </div>
      </div>
    )
  }

  const { data: trainerProfile } = await supabase
    .from('trainer_profiles')
    .select('id, price_per_session')
    .eq('user_id', user!.id)
    .maybeSingle()

  if (!trainerProfile) {
    return (
      <div className="fitall-page fitall-scroll md:bg-[#F7FBFB]">
        <div className="fitall-mobile-ui fitall-topbar">
          <div className="w-10" />
          <h1 className="text-[17px] font-black text-[#0A0A0A] flex-1 text-center">予約</h1>
          <div className="w-10" />
        </div>
        <div className="px-4 py-8 md:px-8">
          <div className="fitall-desktop-container">
          <div className="fitall-card p-6 text-center text-sm font-black text-[#555555]">
            トレーナープロフィールが見つかりません
          </div>
          </div>
        </div>
      </div>
    )
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, scheduled_at, trainee_id, price, status')
    .eq('trainer_id', trainerProfile.id)
    .in('status', ['pending', 'confirmed', 'completed'])
    .order('scheduled_at')

  const traineeMap = await loadTraineeNameMap(
    supabase,
    (bookings ?? []).map((b) => b.trainee_id)
  )

  const bookingIds = (bookings ?? []).map((b) => b.id)
  const { data: credits } = bookingIds.length
    ? await supabase
        .from('session_credits')
        .select('booking_id, status')
        .in('booking_id', bookingIds)
    : { data: [] }
  const creditByBooking = Object.fromEntries(
    (credits ?? []).map((c) => [c.booking_id, c.status])
  )

  const calendarBookings = (bookings ?? []).map((b) => ({
    id: b.id,
    scheduled_at: b.scheduled_at,
    trainee_id: b.trainee_id,
    trainee_name: traineeMap[b.trainee_id] ?? '不明',
    price: b.price,
    status: b.status as 'pending' | 'confirmed' | 'completed' | 'cancelled',
    credit_status: creditByBooking[b.id] ?? null,
  }))

  const { data: activeRelations } = await supabase
    .from('trainer_trainee')
    .select('trainee_id')
    .eq('trainer_id', trainerProfile.id)
    .eq('status', 'active')
  const traineeProfileIds = (activeRelations ?? []).map((r) => r.trainee_id).filter(Boolean)
  const { data: traineeProfiles } = traineeProfileIds.length
    ? await supabase
        .from('trainee_profiles')
        .select('id, user_id')
        .in('id', traineeProfileIds)
    : { data: [] }
  const traineeUserIds = (traineeProfiles ?? []).map((t) => t.user_id).filter(Boolean)
  const { data: traineeUsers } = traineeUserIds.length
    ? await supabase.from('users').select('id, name').in('id', traineeUserIds)
    : { data: [] }
  const traineeUserNameMap = Object.fromEntries((traineeUsers ?? []).map((u) => [u.id, u.name]))
  const clientOptions = (traineeProfiles ?? []).map((profile) => ({
    trainee_id: profile.id,
    name: traineeUserNameMap[profile.user_id] ?? 'お客さん',
  }))

  const { data: planRows } = await supabase
    .from('plans')
    .select('id, name, price')
    .eq('trainer_id', trainerProfile.id)
    .order('created_at')

  const menuOptions =
    planRows && planRows.length > 0
      ? planRows
      : [{ id: '', name: '通常セッション', price: trainerProfile.price_per_session ?? 0 }]

  return (
    <div className="fitall-page fitall-scroll md:bg-[#F7FBFB]">
      <div className="fitall-mobile-ui fitall-topbar">
        <div className="w-10" />
        <h1 className="text-[17px] font-black text-[#0A0A0A] flex-1 text-center">予約</h1>
        <div className="w-10 flex justify-end">
          <Link
            href="/trainer/availability"
            className="text-xs font-black text-[#087D78]"
          >
            空き
          </Link>
        </div>
      </div>

      <div className="hidden px-8 pt-8 md:block">
        <div className="fitall-desktop-container">
          <header className="fitall-desktop-header">
            <div>
              <p className="fitall-kicker">CALENDAR</p>
              <h1 className="fitall-desktop-title">予約管理</h1>
              <p className="mt-2 text-sm font-bold text-[#555555]">カレンダーから予約作成、移動、完了処理まで行えます。</p>
            </div>
            <div className="flex gap-3">
              <Link href="/trainer/invite" className="fitall-aqua-action fitall-tap w-auto min-w-[170px]">リンク送信</Link>
              <Link href="/trainer/availability" className="fitall-secondary-action fitall-tap min-w-[150px]">空き設定</Link>
            </div>
          </header>
        </div>
      </div>
      <div className="px-4 py-6 md:px-8 md:pt-0">
        <div className="fitall-desktop-container">
        <TrainerBookingCalendar
          bookings={calendarBookings}
          clients={clientOptions}
          menus={menuOptions}
        />
        </div>
      </div>
    </div>
  )
}
