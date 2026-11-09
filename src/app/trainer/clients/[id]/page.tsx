import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'
import { addDaysToDateKey, formatJstDate, formatJstDateKey, formatJstTime, parseJstDateTime } from '@/lib/datetime'
import { Screen, Note } from '@/ui/Screen'
import { Section, Row, Empty } from '@/ui/List'
import { Button, Buttons } from '@/ui/Button'
import { TicketCard } from '@/ui/TicketCard'
import { DateList, DateRow } from '@/ui/DateList'
import { addMinutes } from '@/ui/Timeline'
import { loadTicketSummaries, sessionLabel } from '@/lib/ticket-summary'
import { readTrainerSettingsFromBio } from '@/lib/trainer-settings'

type DetailBooking = { id: string; scheduled_at: string; status: string; price: number }

// 表示した時点の時刻
function currentTime() {
  return Date.now()
}

function lineUrl(name: string) {
  return `https://social-plugins.line.me/lineit/share?text=${encodeURIComponent(`${name}さん、いつもありがとうございます。`)}`
}

// 予約の右に出す一言（予定／今日／完了など）
function bookingState(booking: DetailBooking, now: number) {
  if (booking.status === 'pending') return '承認待ち'
  if (booking.status === 'cancelled' || booking.status === 'rejected') return 'キャンセル'
  if (booking.status === 'completed') return '完了'
  if (formatJstDateKey(booking.scheduled_at) === formatJstDateKey(new Date(now))) return '今日'
  return Date.parse(booking.scheduled_at) > now ? '予定' : '完了'
}

// お客様の詳細（A案）。
// 主役：チケット（黒い面）。使った回は穴で見せる。その下に操作2つと最近の予約
function ClientDetailScreen({ name, email, credits, ticketName, expiresLabel, sessionMinutes = 60, profile, bookings, preview = false }: {
  name: string
  email: string
  credits: { available: number; scheduled: number; used: number }
  ticketName?: string | null
  expiresLabel?: string
  sessionMinutes?: number
  profile: { height?: number | null; weight?: number | null; goal?: string | null }
  bookings: DetailBooking[]
  preview?: boolean
}) {
  const total = credits.available + credits.scheduled + credits.used
  const now = currentTime()
  // 次回＝これからの予約のうち、いちばん近いもの
  const next = [...bookings]
    .filter((booking) => (booking.status === 'confirmed' || booking.status === 'pending') && Date.parse(booking.scheduled_at) > now)
    .sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at))[0]
  return (
    <Screen
      back={{ href: '/trainer/clients', label: 'お客様' }}
      title={name}
      nameTitle
      subtitle={[email, profile.goal].filter(Boolean).join(' ・ ')}
    >
      <TicketCard
        title={ticketName || 'チケット'}
        right={total > 0 ? expiresLabel : undefined}
        remaining={credits.available}
        scheduled={credits.scheduled}
        used={credits.used}
        total={total}
        note={next ? `次回 ${formatJstDate(next.scheduled_at, { month: 'long', day: 'numeric', weekday: 'short' })} ${formatJstTime(next.scheduled_at)}` : '次回の予約はまだありません'}
      />

      <Buttons columns={2}>
        <Button href="/trainer/bookings">予約を入れる</Button>
        <Button variant="secondary" href={lineUrl(name)} external>LINEで連絡</Button>
      </Buttons>

      <Section title="最近の予約" action={bookings.length ? `${bookings.length}件` : undefined}>
        {bookings.length ? (
          <DateList>
            {bookings.map((booking) => {
              const start = formatJstTime(booking.scheduled_at)
              return (
                <DateRow
                  key={booking.id}
                  small
                  day={formatJstDate(booking.scheduled_at, { month: 'numeric', day: 'numeric' })}
                  sub={formatJstDate(booking.scheduled_at, { weekday: 'short' })}
                  title={`${start}〜${addMinutes(start, sessionMinutes)}`}
                  meta={sessionLabel(sessionMinutes)}
                  right={bookingState(booking, now)}
                />
              )
            })}
          </DateList>
        ) : <Empty>まだ予約がありません</Empty>}
      </Section>

      <Section header="プロフィール" group>
        <Row title="目標" value={profile.goal || '—'} />
        <Row title="身長" value={profile.height ? `${profile.height} cm` : '—'} />
        <Row title="体重" value={profile.weight ? `${profile.weight} kg` : '—'} />
      </Section>

      {preview ? <Note>確認モード（サンプルのお客様）</Note> : null}
    </Screen>
  )
}

function PreviewClientDetailPage({ id }: { id: string }) {
  const previewClients: Record<string, { name: string; email: string; credits: number; goal: string }> = {
    'preview-1': { name: '佐藤 美咲', email: 'sato@example.com', credits: 2, goal: '週2回で筋力アップ' },
    'preview-2': { name: '田中さん', email: 'tanaka@example.com', credits: 4, goal: '姿勢改善と体力づくり' },
    'preview-3': { name: '山本さん', email: 'yamamoto@example.com', credits: 1, goal: '継続習慣を作る' },
  }
  const client = previewClients[id] ?? previewClients['preview-1']!
  const todayKey = formatJstDateKey()
  return (
    <ClientDetailScreen
      name={client.name}
      email={client.email}
      credits={{ available: client.credits, scheduled: 1, used: 1 }}
      ticketName="4回チケット"
      expiresLabel="期限なし"
      profile={{ goal: client.goal, height: 165, weight: 58 }}
      bookings={[
        { id: 'p1', scheduled_at: parseJstDateTime(addDaysToDateKey(todayKey, 2), '10:00').toISOString(), status: 'confirmed', price: 8800 },
        { id: 'p2', scheduled_at: parseJstDateTime(todayKey, '10:00').toISOString(), status: 'confirmed', price: 8800 },
        { id: 'p3', scheduled_at: parseJstDateTime(addDaysToDateKey(todayKey, -5), '18:00').toISOString(), status: 'completed', price: 8800 },
        { id: 'p4', scheduled_at: parseJstDateTime(addDaysToDateKey(todayKey, -9), '10:00').toISOString(), status: 'completed', price: 8800 },
        { id: 'p5', scheduled_at: parseJstDateTime(addDaysToDateKey(todayKey, -12), '18:00').toISOString(), status: 'completed', price: 8800 },
      ]}
      preview
    />
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
    .select('id, bio')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: traineeProfile } = await supabase
    .from('trainee_profiles')
    .select('id, height, weight, goal')
    .eq('user_id', id)
    .maybeSingle()

  // 自分の担当のお客様だけ表示する
  const { data: relation } = trainerProfile && traineeProfile
    ? await supabase
        .from('trainer_trainee')
        .select('id')
        .eq('trainer_id', trainerProfile.id)
        .eq('trainee_id', traineeProfile.id)
        .eq('status', 'active')
        .maybeSingle()
    : { data: null }

  if (!relation || !trainerProfile || !traineeProfile) notFound()

  const { data: trainee } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', id)
    .maybeSingle()

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, scheduled_at, status, price')
    .eq('trainer_id', trainerProfile.id)
    .eq('trainee_id', traineeProfile.id)
    .order('scheduled_at', { ascending: false })
    .limit(5)

  // チケットの残り・名前・期限
  const summary = (await loadTicketSummaries(supabase, [trainerProfile.id], [traineeProfile.id]))[traineeProfile.id]
  const credits = {
    available: summary?.remaining ?? 0,
    scheduled: summary?.scheduled ?? 0,
    used: summary?.used ?? 0,
  }
  const settings = readTrainerSettingsFromBio(trainerProfile.bio)

  return (
    <ClientDetailScreen
      name={trainee?.name ?? 'お客様'}
      email={trainee?.email ?? 'メール未登録'}
      credits={credits}
      ticketName={summary?.ticketName}
      expiresLabel={summary?.expiresLabel}
      sessionMinutes={settings.session_duration_minutes}
      profile={{ height: traineeProfile.height, weight: traineeProfile.weight, goal: traineeProfile.goal }}
      bookings={(bookings ?? []) as DetailBooking[]}
    />
  )
}
