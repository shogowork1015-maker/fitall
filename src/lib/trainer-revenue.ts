import type { SupabaseClient } from '@supabase/supabase-js'

export type RevenueSale = {
  id: string
  amount: number
  paid_at: string
  booking_id: string | null
  payment_method: string | null
}
export type RevenuePurchase = {
  id: string
  amount: number
  quantity: number
  purchased_at: string
  trainee_id: string
  status: string
}
export type RevenueCredit = { booking_id: string | null; purchase_id: string }
export type TrainerRevenueRecord = {
  id: string
  amount: number
  paid_at: string
  booking_id: string | null
  trainee_id: string | null
  quantity: number
}

export class TrainerRevenueError extends Error {
  constructor(public readonly kind: 'ambiguous' | 'unavailable') {
    super(kind === 'ambiguous'
      ? '購入との対応を確認できない旧Stripe売上があります。集計を停止しました。'
      : '売上を取得できませんでした。')
  }
}

export function trainerRevenueErrorMessage(error: unknown): string {
  return error instanceof TrainerRevenueError && error.kind === 'ambiguous'
    ? '購入と予約売上の対応を確認できないため、売上集計を表示できません。'
    : '売上を取得できませんでした。時間をおいて再読み込みしてください。'
}

// Purchases are the payment source of truth; legacy booking sales remain only
// when no purchase represents that payment. Include non-paid purchases in the
// identity map so a refunded/cancelled purchase cannot reappear as a legacy sale.
// Old Stripe sales without a surviving credit link are ambiguous; never guess.
export function mergeTrainerRevenue(
  sales: RevenueSale[], purchases: RevenuePurchase[], credits: RevenueCredit[], from: string, through?: string
): TrainerRevenueRecord[] {
  const purchaseIds = new Set(purchases.map(p => p.id))
  const purchaseByBooking = new Map(credits.filter(c => c.booking_id).map(c => [c.booking_id, c.purchase_id]))
  const fromTime = Date.parse(from)
  const throughTime = through ? Date.parse(through) : Infinity
  const records: TrainerRevenueRecord[] = purchases
    .filter(p => p.status === 'paid' && Date.parse(p.purchased_at) >= fromTime && Date.parse(p.purchased_at) <= throughTime)
    .map(p => ({ id: `purchase:${p.id}`, amount: p.amount, paid_at: p.purchased_at,
      booking_id: null, trainee_id: p.trainee_id, quantity: p.quantity }))
  for (const sale of sales) {
    // Ticket redemption can leave a zero-value approval row, not a new sale.
    if (sale.amount === 0) continue
    if (Date.parse(sale.paid_at) < fromTime || Date.parse(sale.paid_at) > throughTime) continue
    if (sale.booking_id && purchaseIds.has(purchaseByBooking.get(sale.booking_id) ?? '')) continue
    if (sale.payment_method === 'stripe' && purchases.length) {
      throw new TrainerRevenueError('ambiguous')
    }
    records.push({ id: `sale:${sale.id}`, amount: sale.amount, paid_at: sale.paid_at,
      booking_id: sale.booking_id, trainee_id: null, quantity: 1 })
  }
  return records.sort((a, b) => Date.parse(b.paid_at) - Date.parse(a.paid_at) || a.id.localeCompare(b.id))
}

type RowQuery = {
  range: (from: number, to: number) => PromiseLike<{
    data: unknown[] | null; error: { message: string } | null
  }>
}
async function readAll<T>(query: RowQuery): Promise<T[]> {
  const rows: T[] = []
  // Supabase's default row cap must not silently truncate revenue or identities.
  const pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await query.range(offset, offset + pageSize - 1)
    if (error || !data) throw new TrainerRevenueError('unavailable')
    rows.push(...data as T[])
    if (data.length < pageSize) return rows
  }
}

export async function loadTrainerRevenue(
  supabase: Pick<SupabaseClient, 'from'>, trainerIds: string[], from: string, through?: string
): Promise<TrainerRevenueRecord[]> {
  if (!trainerIds.length) return []
  let salesQuery = supabase.from('sales_records')
    .select('id, amount, paid_at, booking_id, payment_method')
    .in('trainer_id', trainerIds).gte('paid_at', from).order('id')
  if (through) salesQuery = salesQuery.lte('paid_at', through)
  const [sales, purchases] = await Promise.all([
    readAll<RevenueSale>(salesQuery),
    // Older purchases also identify legacy sales recorded in the current period.
    readAll<RevenuePurchase>(supabase.from('session_credit_purchases')
      .select('id, amount, quantity, purchased_at, trainee_id, status')
      .in('trainer_id', trainerIds).order('id')),
  ])
  const bookingIds = [...new Set(sales.map(s => s.booking_id).filter((id): id is string => !!id))]
  const credits: RevenueCredit[] = []
  for (let i = 0; i < bookingIds.length; i += 100) {
    credits.push(...await readAll<RevenueCredit>(supabase.from('session_credits')
      .select('id, booking_id, purchase_id').in('trainer_id', trainerIds)
      .in('booking_id', bookingIds.slice(i, i + 100)).order('id')))
  }
  return mergeTrainerRevenue(sales, purchases, credits, from, through)
}
