import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { isDevAuthBypassEnabled } from '@/lib/dev-preview'

type ClientRow = {
  id: string
  name: string
  last: string
  sessions: number
  credits: number
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
      <div className="fitall-topbar">
        <div className="w-10" />
        <h1 className="flex-1 text-center text-[17px] font-black text-[#0A0A0A]">顧客</h1>
        <Link href="/trainer/clients/new" className="w-10 text-right text-xs font-black text-[#087D78]">
          追加
        </Link>
      </div>

      <div className="fitall-page-pad space-y-5">
        {preview && (
          <div className="fitall-card bg-[#E8FBFA] px-4 py-3 text-xs font-black text-[#087D78]">
            開発用UI確認モードです。顧客詳細への保存操作はありません。
          </div>
        )}

        <section className="fitall-card-strong overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-[#0A0A0A]">
            <div className="p-4">
              <p className="fitall-kicker">CLIENTS</p>
              <p className="mt-2 text-[34px] font-black leading-none text-[#0A0A0A]">
                {clients.length}<span className="ml-1 text-sm">名</span>
              </p>
              <p className="mt-2 text-xs font-bold text-[#555555]">管理中のお客様</p>
            </div>
            <div className="bg-[#12C7BE] p-4 text-white">
              <p className="text-[10px] font-black tracking-[0.12em] text-white/80">ACTION</p>
              <p className="mt-2 text-[34px] font-black leading-none">
                {lowCreditCount}<span className="ml-1 text-sm">名</span>
              </p>
              <p className="mt-2 text-xs font-black">残チケット少なめ</p>
            </div>
          </div>
        </section>

        {!clients.length ? (
          <section className="fitall-card p-6 text-center">
            <p className="text-sm font-black text-[#0A0A0A]">まだお客さんがいません</p>
            <p className="mt-2 text-xs font-bold leading-relaxed text-[#555555]">
              お客様を仮登録して、LINEで登録リンクを送れます。
            </p>
            <Link href="/trainer/clients/new" className="fitall-aqua-action fitall-tap mt-4">
              お客様を追加
            </Link>
          </section>
        ) : (
          <section>
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="fitall-section-title">お客様一覧</h2>
              <span className="text-xs font-black text-[#555555]">残チケットも確認</span>
            </div>
            <div className="space-y-2">
              {clients.map((client, index) => (
                <Link
                  key={client.id}
                  href={`/trainer/clients/${client.id}`}
                  className="fitall-card fitall-card-pop fitall-tap grid grid-cols-[46px_1fr_auto] items-center gap-3 p-3"
                  style={{ animationDelay: `${index * 35}ms` }}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-[5px] bg-[#0A0A0A] text-base font-black text-white">
                    {client.name[0] ?? '?'}
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#0A0A0A]">{client.name}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-[#555555]">最終: {client.last}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-[#0A0A0A]">今月{client.sessions}回</p>
                    <p className={`mt-1 rounded-[4px] px-2 py-1 text-[11px] font-black ${
                      client.credits <= 1 ? 'bg-[#0A0A0A] text-white' : 'bg-[#E8FBFA] text-[#087D78]'
                    }`}>
                      残{client.credits}回
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
    <div className="fitall-desktop-ui fitall-desktop-page">
      <div className="fitall-desktop-container">
        <header className="fitall-desktop-header">
          <div>
            <p className="fitall-kicker">CLIENTS</p>
            <h1 className="fitall-desktop-title">顧客管理</h1>
            <p className="mt-2 text-sm font-bold text-[#555555]">
              PCでは残チケット、今月回数、最終記録を一覧で確認できます。
            </p>
          </div>
          <Link href="/trainer/clients/new" className="fitall-aqua-action fitall-tap w-auto min-w-[180px]">
            お客様を追加
          </Link>
        </header>

        {preview && (
          <div className="fitall-desktop-card mb-5 bg-[#E8FBFA] px-5 py-3 text-sm font-black text-[#087D78]">
            開発用UI確認モードです。顧客詳細への保存操作はありません。
          </div>
        )}

        <section className="mb-5 grid grid-cols-3 gap-4">
          <div className="fitall-desktop-card border-[#0A0A0A] p-5">
            <p className="fitall-kicker">CLIENTS</p>
            <p className="mt-3 text-5xl font-black text-[#0A0A0A]">{clients.length}<span className="ml-1 text-base">名</span></p>
            <p className="mt-2 text-sm font-bold text-[#555555]">管理中のお客様</p>
          </div>
          <div className="fitall-desktop-card p-5 text-white" style={{ backgroundColor: '#12C7BE' }}>
            <p className="text-[10px] font-black tracking-[0.12em] text-white/80">ACTION</p>
            <p className="mt-3 text-5xl font-black">{lowCreditCount}<span className="ml-1 text-base">名</span></p>
            <p className="mt-2 text-sm font-black">残チケット少なめ</p>
          </div>
          <div className="fitall-desktop-card p-5">
            <p className="fitall-kicker">NEXT</p>
            <p className="mt-3 text-xl font-black text-[#0A0A0A]">連絡・更新の確認</p>
            <p className="mt-2 text-sm font-bold text-[#555555]">残1回以下のお客様に次回チケット案内</p>
          </div>
        </section>

        {!clients.length ? (
          <section className="fitall-desktop-card p-10 text-center">
            <p className="text-lg font-black text-[#0A0A0A]">まだお客さんがいません</p>
            <p className="mt-2 text-sm font-bold text-[#555555]">お客様を仮登録して、LINEで登録リンクを送れます。</p>
            <Link href="/trainer/clients/new" className="fitall-aqua-action fitall-tap mx-auto mt-5 w-auto min-w-[220px]">
              お客様を追加
            </Link>
          </section>
        ) : (
          <section className="fitall-desktop-card overflow-hidden">
            <div className="grid grid-cols-[1.4fr_.9fr_.8fr_.8fr_120px] border-b-2 border-[#0A0A0A] bg-[#0A0A0A] px-5 py-3 text-xs font-black text-white">
              <span>お客様</span>
              <span>最終</span>
              <span>今月</span>
              <span>残チケット</span>
              <span className="text-right">操作</span>
            </div>
            <div className="divide-y divide-[#DDE8E8]">
              {clients.map((client) => (
                <Link
                  key={client.id}
                  href={`/trainer/clients/${client.id}`}
                  className="grid grid-cols-[1.4fr_.9fr_.8fr_.8fr_120px] items-center px-5 py-4 hover:bg-[#F7FBFB]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[5px] bg-[#0A0A0A] text-base font-black text-white">
                      {client.name[0] ?? '?'}
                    </div>
                    <p className="text-base font-black text-[#0A0A0A]">{client.name}</p>
                  </div>
                  <p className="text-sm font-bold text-[#555555]">{client.last}</p>
                  <p className="text-sm font-black text-[#0A0A0A]">{client.sessions}回</p>
                  <span className={`w-fit rounded-[4px] px-3 py-1 text-xs font-black ${
                    client.credits <= 1 ? 'bg-[#0A0A0A] text-white' : 'bg-[#E8FBFA] text-[#087D78]'
                  }`}>
                    残{client.credits}回
                  </span>
                  <span className="text-right text-sm font-black text-[#087D78]">詳細</span>
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
      name: trainee.name ?? 'お客さん',
      last: lastLog ? new Date(lastLog).toLocaleDateString('ja-JP') : 'まだなし',
      sessions: sessionCounts[trainee.id] ?? 0,
      credits: creditCountByUserId[trainee.id] ?? 0,
    }
  })

  return <ClientListScreen clients={clients} />
}
