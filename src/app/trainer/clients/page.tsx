import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function TrainerClientsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // trainer_trainee.trainer_id は trainer_profiles.id を参照するため先に取得
  const { data: profile } = await supabase
    .from('trainer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  // 担当トレーニー一覧を取得
  const { data: relations } = profile
    ? await supabase
        .from('trainer_trainee')
        .select('trainee_id')
        .eq('trainer_id', profile.id)
        .eq('status', 'active')
    : { data: [] }

  // trainee_trainee.trainee_id は trainee_profiles.id を参照するため user_id へ変換
  const traineeProfileIds = (relations ?? [])
    .map((r) => r.trainee_id)
    .filter(Boolean) as string[]

  if (!traineeProfileIds.length) {
    return (
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#0A0A0A] mb-6">
          お客さん一覧
        </h1>
        <div className="bg-white rounded-[20px] p-8 text-center border border-[#E5E7EB]">
          <p className="text-sm text-[#9CA3AF]">まだお客さんがいません</p>
          <Link
            href="/trainer/invite"
            className="mt-4 inline-block text-sm font-semibold text-[#0066FF]"
          >
            招待リンクを作成する →
          </Link>
        </div>
      </div>
    )
  }

  // trainee_profiles.id → user_id のマッピングを取得
  const { data: traineeProfiles } = await supabase
    .from('trainee_profiles')
    .select('id, user_id')
    .in('id', traineeProfileIds)

  const traineeUserIds = (traineeProfiles ?? [])
    .map((p) => p.user_id)
    .filter(Boolean) as string[]

  if (!traineeUserIds.length) {
    return (
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#0A0A0A] mb-6">
          お客さん一覧
        </h1>
        <div className="bg-white rounded-[20px] p-8 text-center border border-[#E5E7EB]">
          <p className="text-sm text-[#9CA3AF]">まだお客さんがいません</p>
        </div>
      </div>
    )
  }

  // トレーニー情報を取得（users.id で検索）
  const { data: trainees } = await supabase
    .from('users')
    .select('id, name')
    .in('id', traineeUserIds)

  // 今月のセッション数を集計（bookings.trainee_id = users.id）
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { data: monthBookings } = profile
    ? await supabase
        .from('bookings')
        .select('trainee_id, status')
        .eq('trainer_id', profile.id)
        .in('trainee_id', traineeUserIds)
        .in('status', ['confirmed', 'completed'])
        .gte('scheduled_at', monthStart.toISOString())
    : { data: [] }

  const sessionCounts = (monthBookings ?? []).reduce<Record<string, number>>(
    (acc, b) => {
      acc[b.trainee_id] = (acc[b.trainee_id] ?? 0) + 1
      return acc
    },
    {}
  )

  // 最終トレーニング日を取得（workout_logs.trainee_id = trainee_profiles.id）
  // trainee_profiles.id → user_id の逆引きマップを作成
  const profileIdToUserId = Object.fromEntries(
    (traineeProfiles ?? []).map((p) => [p.id, p.user_id])
  )

  const { data: lastLogs } = traineeProfileIds.length
    ? await supabase
        .from('workout_logs')
        .select('trainee_id, logged_at')
        .in('trainee_id', traineeProfileIds)
        .order('logged_at', { ascending: false })
    : { data: [] }

  // trainee_profiles.id → users.id に変換して最終ログ日時マップを作成
  const lastLogMap: Record<string, string> = {}
  for (const log of lastLogs ?? []) {
    const userId = profileIdToUserId[log.trainee_id]
    if (userId && !lastLogMap[userId]) {
      lastLogMap[userId] = log.logged_at
    }
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#0A0A0A] mb-4">
        お客さん一覧
        <span className="ml-2 text-base font-normal text-[#9CA3AF]">
          {trainees?.length ?? 0}名
        </span>
      </h1>

      <div className="space-y-2">
        {(trainees ?? []).map((trainee) => {
          const lastLog = lastLogMap[trainee.id]
          const sessions = sessionCounts[trainee.id] ?? 0

          return (
            <Link
              key={trainee.id}
              href={`/trainer/clients/${trainee.id}`}
              className="block bg-white rounded-[20px] px-4 py-4 border border-[#E5E7EB] shadow-[0px_1px_3px_rgba(0,0,0,0.04),0px_1px_2px_rgba(0,0,0,0.06)] active:bg-[#F8F9FA] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#0A0A0A]">{trainee.name}</p>
                  <p className="text-sm text-[#9CA3AF] mt-0.5">
                    {lastLog
                      ? `最終トレーニング: ${new Date(lastLog).toLocaleDateString('ja-JP')}`
                      : 'まだトレーニングなし'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#0A0A0A] tabular-nums">
                    {sessions}回
                  </p>
                  <p className="text-xs text-[#9CA3AF]">今月</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
