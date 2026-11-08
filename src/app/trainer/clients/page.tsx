import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'
import { DevPreviewNote, HeaderAction, PageHeader } from '@/components/ui/PageHeader'
import { ChevronRightIcon, PlusIcon, TicketIcon } from '@/components/ui/Icons'

type ClientRow = {
  id: string
  name: string
  last: string
  sessions: number
  credits: number
}

// お客様の1行。残チケットが1回以下ならオレンジで知らせる
function ClientRowLink({ client }: { client: ClientRow }) {
  const low = client.credits <= 1
  return (
    <Link href={`/trainer/clients/${client.id}`} className="fitall-row" data-inset="avatar">
      <span className="fitall-avatar">{client.name[0] ?? '?'}</span>
      <div className="fitall-row-main">
        <p className="fitall-row-title">{client.name}</p>
        <p className="fitall-row-meta">
          <span>最終 {client.last}</span>
          <span>今月 {client.sessions}回</span>
        </p>
      </div>
      <span className="fitall-badge" data-tone={low ? 'warn' : 'accent'}>
        <TicketIcon size={16} />残{client.credits}
      </span>
      <ChevronRightIcon />
    </Link>
  )
}

function ClientListScreen({
  clients,
  preview = false,
}: {
  clients: ClientRow[]
  preview?: boolean
}) {
  const lowCreditCount = clients.filter((client) => client.credits <= 1).length

  return (
    <>
    <div className="fitall-mobile-ui fitall-page fitall-scroll">
      <PageHeader
        title="お客様"
        subtitle={`${clients.length}名${lowCreditCount > 0 ? `・残り少ない方 ${lowCreditCount}名` : ''}`}
        actions={
          <HeaderAction href="/trainer/clients/new" label="お客様を追加" tone="ink">
            <PlusIcon />
          </HeaderAction>
        }
      />

      <div className="fitall-page-pad space-y-7">
        {preview && <DevPreviewNote>開発用の確認モード（サンプル表示）</DevPreviewNote>}

        {!clients.length ? (
          <section className="fitall-card px-5 py-8 text-center">
            <p className="text-lg font-semibold text-ink">まだお客様がいません</p>
            <p className="mt-2 text-subhead leading-relaxed text-ink-muted">
              お客様を仮登録して、LINEで登録リンクを送れます。
            </p>
            <Link href="/trainer/clients/new" className="fitall-primary-action mt-5">
              お客様を追加
            </Link>
          </section>
        ) : (
          <>
            {lowCreditCount > 0 && (
              <section>
                <h2 className="fitall-group-label">チケットが残り少ない方</h2>
                <div className="fitall-group">
                  {clients.filter((client) => client.credits <= 1).map((client) => (
                    <ClientRowLink key={client.id} client={client} />
                  ))}
                </div>
                <p className="fitall-group-note">次回のチケット購入をご案内しましょう。</p>
              </section>
            )}
            <section>
              <h2 className="fitall-group-label">すべてのお客様</h2>
              <div className="fitall-group">
                {clients.map((client) => (
                  <ClientRowLink key={client.id} client={client} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
    <div className="fitall-desktop-ui fitall-desktop-page">
      <div className="fitall-desktop-container">
        <header className="fitall-desktop-header">
          <div>
            <p className="fitall-kicker">お客様</p>
            <h1 className="fitall-desktop-title">お客様管理</h1>
            <p className="mt-2 text-subhead font-medium text-ink-muted">
              PCでは残チケット、今月回数、最終記録を一覧で確認できます。
            </p>
          </div>
          <Link href="/trainer/clients/new" className="fitall-aqua-action fitall-tap w-auto min-w-[180px]">
            お客様を追加
          </Link>
        </header>

        {preview && (
          <div className="mb-5"><DevPreviewNote>開発用の確認モード。お客様詳細への保存操作はありません。</DevPreviewNote></div>
        )}

        <section className="mb-5 grid grid-cols-3 gap-4">
          <div className="fitall-desktop-card p-5">
            <p className="fitall-kicker">お客様</p>
            <p className="mt-3 text-5xl font-black text-ink">{clients.length}<span className="ml-1 text-base">名</span></p>
            <p className="mt-2 text-subhead font-medium text-ink-muted">管理中のお客様</p>
          </div>
          <div className="fitall-desktop-card p-5">
            <p className="text-base font-semibold text-warn">要フォロー</p>
            <p className="fitall-figure mt-3 text-5xl">{lowCreditCount}<small>名</small></p>
            <p className="mt-2 text-subhead text-ink-muted">残チケットが1回以下</p>
          </div>
          <div className="fitall-desktop-card p-5">
            <p className="fitall-kicker">次回</p>
            <p className="mt-3 text-xl font-black text-ink">連絡・更新の確認</p>
            <p className="mt-2 text-subhead font-medium text-ink-muted">残1回以下のお客様に次回チケット案内</p>
          </div>
        </section>

        {!clients.length ? (
          <section className="fitall-desktop-card p-10 text-center">
            <p className="text-lg font-black text-ink">まだお客様がいません</p>
            <p className="mt-2 text-subhead font-medium text-ink-muted">お客様を仮登録して、LINEで登録リンクを送れます。</p>
            <Link href="/trainer/clients/new" className="fitall-aqua-action fitall-tap mx-auto mt-5 w-auto min-w-[220px]">
              お客様を追加
            </Link>
          </section>
        ) : (
          <section className="fitall-desktop-card overflow-hidden">
            <div className="fitall-list-head grid grid-cols-[1.4fr_.9fr_.8fr_.8fr_120px] px-5 py-3 text-base">
              <span>お客様</span>
              <span>最終</span>
              <span>今月</span>
              <span>残チケット</span>
              <span className="text-right">操作</span>
            </div>
            <div className="divide-y divide-line">
              {clients.map((client) => (
                <Link
                  key={client.id}
                  href={`/trainer/clients/${client.id}`}
                  className="grid grid-cols-[1.4fr_.9fr_.8fr_.8fr_120px] items-center px-5 py-4 hover:bg-surface-soft"
                >
                  <div className="flex items-center gap-3">
                    <span className="fitall-avatar">{client.name[0] ?? '?'}</span>
                    <p className="text-base font-black text-ink">{client.name}</p>
                  </div>
                  <p className="text-subhead font-medium text-ink-muted">{client.last}</p>
                  <p className="text-base font-bold text-ink">{client.sessions}回</p>
                  <span className="fitall-badge w-fit" data-tone={client.credits <= 1 ? 'warn' : 'accent'}>
                    残{client.credits}回
                  </span>
                  <span className="text-right text-base font-bold text-brand">詳細</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
    </>
  )
}

export default async function TrainerClientsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const devAuthBypass = isDevAuthBypassEnabled()

  if (!user && !devAuthBypass) redirect('/auth/login')

  if (!user && devAuthBypass) {
    return (
      <ClientListScreen
        preview
        clients={[
          { id: 'preview-1', name: '佐藤さん', last: '今日', sessions: 3, credits: 2 },
          { id: 'preview-2', name: '田中さん', last: '6/28', sessions: 2, credits: 4 },
          { id: 'preview-3', name: '山本さん', last: '6/25', sessions: 1, credits: 1 },
        ]}
      />
    )
  }

  const { data: profile } = await supabase
    .from('trainer_profiles')
    .select('id')
    .eq('user_id', user!.id)
    .maybeSingle()

  const { data: relations } = profile
    ? await supabase
        .from('trainer_trainee')
        .select('trainee_id')
        .eq('trainer_id', profile.id)
        .eq('status', 'active')
    : { data: [] }

  const traineeProfileIds = (relations ?? [])
    .map((r) => r.trainee_id)
    .filter(Boolean) as string[]

  if (!traineeProfileIds.length) {
    return <ClientListScreen clients={[]} />
  }

  const { data: traineeProfiles } = await supabase
    .from('trainee_profiles')
    .select('id, user_id')
    .in('id', traineeProfileIds)

  const traineeUserIds = (traineeProfiles ?? [])
    .map((p) => p.user_id)
    .filter(Boolean) as string[]

  if (!traineeUserIds.length) {
    return <ClientListScreen clients={[]} />
  }

  const { data: trainees } = await supabase
    .from('users')
    .select('id, name')
    .in('id', traineeUserIds)

  const profileIdToUserId = Object.fromEntries(
    (traineeProfiles ?? []).map((p) => [p.id, p.user_id])
  )

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { data: monthBookings } = profile
    ? await supabase
        .from('bookings')
        .select('trainee_id, status')
        .eq('trainer_id', profile.id)
        .in('trainee_id', traineeProfileIds)
        .in('status', ['confirmed', 'completed'])
        .gte('scheduled_at', monthStart.toISOString())
    : { data: [] }

  const sessionCounts = (monthBookings ?? []).reduce<Record<string, number>>(
    (acc, b) => {
      const userId = profileIdToUserId[b.trainee_id]
      if (userId) acc[userId] = (acc[userId] ?? 0) + 1
      return acc
    },
    {}
  )

  const { data: lastLogs } = traineeProfileIds.length
    ? await supabase
        .from('workout_logs')
        .select('trainee_id, logged_at')
        .in('trainee_id', traineeProfileIds)
        .order('logged_at', { ascending: false })
    : { data: [] }

  const lastLogMap: Record<string, string> = {}
  for (const log of lastLogs ?? []) {
    const userId = profileIdToUserId[log.trainee_id]
    if (userId && !lastLogMap[userId]) {
      lastLogMap[userId] = log.logged_at
    }
  }

  const { data: creditRows } = profile
    ? await supabase
        .from('session_credits')
        .select('trainee_id, status')
        .eq('trainer_id', profile.id)
        .in('trainee_id', traineeProfileIds)
        .in('status', ['available', 'scheduled'])
    : { data: [] }

  const creditCountByUserId: Record<string, number> = {}
  for (const credit of creditRows ?? []) {
    const userId = profileIdToUserId[credit.trainee_id]
    if (userId) creditCountByUserId[userId] = (creditCountByUserId[userId] ?? 0) + 1
  }

  const clients: ClientRow[] = (trainees ?? []).map((trainee) => {
    const lastLog = lastLogMap[trainee.id]
    return {
      id: trainee.id,
      name: trainee.name ?? 'お客様',
      last: lastLog ? new Date(lastLog).toLocaleDateString('ja-JP') : 'まだなし',
      sessions: sessionCounts[trainee.id] ?? 0,
      credits: creditCountByUserId[trainee.id] ?? 0,
    }
  })

  return <ClientListScreen clients={clients} />
}
