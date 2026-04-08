import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { BookingRequestForm } from './BookingRequestForm'
import { CancelBookingButton } from './CancelBookingButton'
import { ChangeProposalCard } from './ChangeProposalCard'

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function expandWeeklyRowsToDateSlots(rows: { day_of_week: number; start_time: string; end_time: string }[]) {
  const now = new Date()
  const start = addDays(now, -30)
  const end = addDays(now, 180)
  const result: { slot_date: string; start_time: string; end_time: string }[] = []

  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    const row = rows.find((r) => r.day_of_week === cursor.getDay())
    if (!row) continue
    result.push({
      slot_date: toDateKey(cursor),
      start_time: row.start_time,
      end_time: row.end_time,
    })
  }
  return result
}

export default async function TraineeBookingPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // trainer_trainee.trainee_id は trainee_profiles.id を参照するため先に取得
  const { data: myTraineeProfiles } = await supabase
    .from('trainee_profiles')
    .select('id')
    .eq('user_id', user.id)
  const traineeIds = (myTraineeProfiles ?? []).map((p) => p.id)

  // トレーナーとの紐付けがあるか確認（未紐付けはダッシュボードへ）
  const { data: relation } = traineeIds.length
    ? await supabase
        .from('trainer_trainee')
        .select('trainer_id')
        .in('trainee_id', traineeIds)
        .eq('status', 'active')
        .maybeSingle()
    : { data: null }

  if (!relation) redirect('/trainee/dashboard')

  const { data: trainerProfile } = await supabase
    .from('trainer_profiles')
    .select('id, bio')
    .eq('id', relation.trainer_id)
    .maybeSingle()

  // トレーナーの空き時間を取得（BookingRequestForm に渡す）
  let availability: { slot_date: string; start_time: string; end_time: string }[] = []
  {
    const { data, error } = await supabase
      .from('trainer_availability')
      .select('slot_date, start_time, end_time')
      .eq('trainer_id', relation.trainer_id)
      .order('slot_date')

    if (error && (error.code === 'PGRST204' || error.message?.includes("'slot_date' column"))) {
      const { data: legacyData } = await supabase
        .from('trainer_availability')
        .select('day_of_week, start_time, end_time')
        .eq('trainer_id', relation.trainer_id)
        .order('day_of_week')
      availability = expandWeeklyRowsToDateSlots(legacyData ?? [])
    } else {
      availability = data ?? []
    }
  }

  // 自分の予約一覧（最新20件）
  const { data: bookings } = traineeIds.length
    ? await supabase
        .from('bookings')
        .select('id, scheduled_at, status, price')
        .in('trainee_id', traineeIds)
        .order('scheduled_at', { ascending: false })
        .limit(20)
    : { data: [] }

  // 変更提案（pending のみ）
  const bookingIds = (bookings ?? []).map((b) => b.id)
  const { data: changeProposals } = bookingIds.length
    ? await supabase
        .from('booking_changes')
        .select('id, booking_id, proposed_at')
        .in('booking_id', bookingIds)
        .eq('status', 'pending')
    : { data: [] }

  // 変更提案を booking_id でマップ
  const proposalByBooking = Object.fromEntries(
    (changeProposals ?? []).map((p) => [p.booking_id, p])
  )

  const statusLabel: Record<string, string> = {
    pending: '承認待ち',
    confirmed: '確定',
    cancelled: 'キャンセル',
    completed: '完了',
  }

  const statusColor: Record<string, string> = {
    pending: 'bg-[#FEF3C7] text-[#92400E]',
    confirmed: 'bg-[#DCFCE7] text-[#166534]',
    cancelled: 'bg-[#F3F4F6] text-[#6B7280]',
    completed: 'bg-[#EFF6FF] text-[#1E40AF]',
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#0A0A0A]">予約</h1>

      {/* 予約リクエストフォーム */}
      <BookingRequestForm
        availability={availability}
        existingBookings={bookings ?? []}
        trainerBio={trainerProfile?.bio ?? null}
      />

      {/* 予約一覧 */}
      <div>
        <h2 className="text-base font-bold text-[#0A0A0A] mb-3">予約履歴</h2>
        {!bookings?.length ? (
          <div className="bg-white rounded-[20px] p-6 text-center text-sm text-[#9CA3AF] border border-[#E5E7EB]">
            予約がありません
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.map((b) => {
              const proposal = proposalByBooking[b.id]
              return (
                <div key={b.id} className="space-y-2">
                  {/* 変更提案カード（pending時に表示） */}
                  {proposal && (
                    <ChangeProposalCard
                      proposalId={proposal.id}
                      bookingId={b.id}
                      originalAt={b.scheduled_at}
                      proposedAt={proposal.proposed_at}
                    />
                  )}
                  <div className="bg-white rounded-[20px] px-4 py-3 border border-[#E5E7EB] shadow-[0px_1px_3px_rgba(0,0,0,0.04),0px_1px_2px_rgba(0,0,0,0.06)]">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-[#0A0A0A]">
                          {new Date(b.scheduled_at).toLocaleDateString('ja-JP', {
                            month: 'long',
                            day: 'numeric',
                            weekday: 'short',
                          })}
                        </p>
                        <p className="text-sm text-[#9CA3AF]">
                          {new Date(b.scheduled_at).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          · ¥{b.price.toLocaleString()}
                        </p>
                        {/* キャンセルボタン（pending/confirmed のみ） */}
                        {['pending', 'confirmed'].includes(b.status) && (
                          <CancelBookingButton
                            bookingId={b.id}
                            scheduledAt={b.scheduled_at}
                          />
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-[0.08em] px-[10px] py-[3px] rounded-[6px] ${statusColor[b.status] ?? 'bg-[#F3F4F6] text-[#6B7280]'}`}
                      >
                        {statusLabel[b.status] ?? b.status}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
