import { formatJstDate } from './datetime'

// お客様ごとのチケットの状況（トレーナー側の画面で「残り2回」「4回チケット」などを出すために使う）

type Row = Record<string, string | number | null>
type Query = PromiseLike<{ data: Row[] | null }> & {
  in: (column: string, values: string[]) => Query
  eq: (column: string, value: string) => Query
}
type SupabaseLike = { from: (table: string) => { select: (columns: string) => Query } }

export interface TicketSummary {
  /** まだ予約に使っていない残り */
  remaining: number
  /** 予約に使う予定の回 */
  scheduled: number
  /** 使い終わった回 */
  used: number
  /** 最近買ったチケットの名前（例：4回チケット） */
  ticketName: string | null
  /** 有効期限（例：12/31まで／期限なし） */
  expiresLabel: string
  /** 最近買った日 */
  purchasedAt: string | null
}

function unique(values: (string | null | undefined)[]) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

// 1回の長さから、予約の中身の名前を作る（例：パーソナル60分）
export function sessionLabel(minutes: number) {
  return `パーソナル${minutes}分`
}

// 購入IDごとのメニュー名（例：4回チケット）。見つからないものは入れない
export async function loadPurchasePlanNames(supabase: unknown, purchaseIds: string[]) {
  const client = supabase as SupabaseLike
  const ids = unique(purchaseIds)
  if (!ids.length) return {} as Record<string, string>
  const { data: purchases } = await client.from('session_credit_purchases').select('id, plan_id').in('id', ids)
  const planIds = unique((purchases ?? []).map((row) => row.plan_id as string | null))
  const { data: plans } = planIds.length
    ? await client.from('plans').select('id, name').in('id', planIds)
    : { data: [] as Row[] }
  const planNames = Object.fromEntries((plans ?? []).map((plan) => [plan.id, plan.name as string]))
  const names: Record<string, string> = {}
  for (const purchase of purchases ?? []) {
    const name = planNames[purchase.plan_id as string]
    if (name) names[purchase.id as string] = name
  }
  return names
}

// お客様（trainee_profiles.id）ごとのチケットの状況
export async function loadTicketSummaries(
  supabase: unknown,
  trainerIds: string[],
  traineeIds: string[]
): Promise<Record<string, TicketSummary>> {
  const client = supabase as SupabaseLike
  const trainers = unique(trainerIds)
  const trainees = unique(traineeIds)
  if (!trainers.length || !trainees.length) return {}

  const { data: credits } = await client
    .from('session_credits')
    .select('trainee_id, status, purchase_id, expires_at')
    .in('trainer_id', trainers)
    .in('trainee_id', trainees)

  const purchaseIds = unique((credits ?? []).map((credit) => credit.purchase_id as string | null))
  const { data: purchases } = purchaseIds.length
    ? await client.from('session_credit_purchases').select('id, purchased_at').in('id', purchaseIds)
    : { data: [] as Row[] }
  const purchasedAt = Object.fromEntries((purchases ?? []).map((row) => [row.id, row.purchased_at as string | null]))
  const planNames = await loadPurchasePlanNames(client, purchaseIds)

  const result: Record<string, TicketSummary> = {}
  for (const credit of credits ?? []) {
    const traineeId = credit.trainee_id as string
    const summary = (result[traineeId] ??= {
      remaining: 0, scheduled: 0, used: 0, ticketName: null, expiresLabel: '期限なし', purchasedAt: null,
    })
    if (credit.status === 'available') summary.remaining += 1
    if (credit.status === 'scheduled') summary.scheduled += 1
    if (credit.status === 'used') summary.used += 1

    // いちばん新しく買ったチケットの名前と期限を出す
    const purchaseId = credit.purchase_id as string | null
    const bought = purchaseId ? purchasedAt[purchaseId] ?? null : null
    if (bought && (!summary.purchasedAt || bought > summary.purchasedAt)) {
      summary.purchasedAt = bought
      summary.ticketName = purchaseId ? planNames[purchaseId] ?? null : null
      summary.expiresLabel = credit.expires_at
        ? `${formatJstDate(credit.expires_at as string, { month: 'numeric', day: 'numeric' })}まで`
        : '期限なし'
    }
  }
  return result
}

// 確定・完了した予約が過去にあるお客様（それ以外は「はじめて」）
export async function loadVisitedTrainees(supabase: unknown, trainerIds: string[], traineeIds: string[]) {
  const client = supabase as SupabaseLike
  const trainers = unique(trainerIds)
  const trainees = unique(traineeIds)
  if (!trainers.length || !trainees.length) return new Set<string>()
  const { data } = await client
    .from('bookings')
    .select('trainee_id, scheduled_at')
    .in('trainer_id', trainers)
    .in('trainee_id', trainees)
    .in('status', ['confirmed', 'completed'])
  const now = new Date().toISOString()
  return new Set((data ?? []).filter((row) => String(row.scheduled_at) < now).map((row) => row.trainee_id as string))
}
