import { createAdminSupabaseClient } from './supabase-admin'
import { createServerSupabaseClient } from './supabase-server'
import { getCustomerSessionUserId } from './customer-session'
import { isDevAuthBypassEnabled } from './dev-preview'
import { addDaysToDateKey, formatJstDate, formatJstDateKey, formatJstTime } from './datetime'
import {
  getPlanSettings,
  readTrainerPlanSettingsFromBio,
  type TrainerPlanBillingType,
} from './trainer-settings'
import { getPublicBookingData } from './public-booking'

export interface CustomerTicket {
  id: string
  title: string
  kind: TrainerPlanBillingType
  remaining: number
  scheduled: number
  used: number
  total: number
  expiresLabel: string
  note: string
}

export interface CustomerBooking {
  id: string
  scheduled_at: string
  status: string
  price: number
  title: string
}

export interface CustomerMenu {
  id: string
  name: string
  price: number
  sessions: number
  billing_type: TrainerPlanBillingType
  description: string
}

export interface CustomerAvailabilityCell {
  time: string
  status: 'open' | 'closed'
  value?: string
  availableLabel?: string
}

export interface CustomerAvailabilityDay {
  dateKey: string
  dateLabel: string
  weekday: string
  openCount: number
  cells: CustomerAvailabilityCell[]
}

export interface CustomerAppData {
  preview: boolean
  customer: {
    id: string
    name: string
    email: string
    goal: string
    lineUserId: string | null
  }
  trainer: {
    name: string
    profileId: string
  }
  viewer: {
    role: 'trainer' | 'trainee' | null
    canConnectLine: boolean
  }
  tickets: CustomerTicket[]
  upcomingBookings: CustomerBooking[]
  pastBookings: CustomerBooking[]
  availability: CustomerAvailabilityDay[]
  menus: CustomerMenu[]
  purchaseUrl: string
}

type SupabaseAny = Awaited<ReturnType<typeof createServerSupabaseClient>>

export interface CustomerAppMutationContext {
  supabase: SupabaseAny
  customerUser: {
    id: string
    name: string | null
    email: string | null
    role: string | null
    line_user_id: string | null
  }
  traineeProfile: {
    id: string
    user_id: string
    goal: string | null
  }
  trainerProfile: {
    id: string
    user_id: string
    bio: string | null
  }
  trainerUser: {
    name: string | null
    email: string | null
    line_user_id: string | null
  } | null
}

export interface CustomerAppEntryData {
  trainer: {
    profileId: string
    name: string
  }
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatDateLabel(value: string | Date) {
  return formatJstDate(value, {
    month: 'numeric',
    day: 'numeric',
  })
}

function dateKey(value: Date) {
  return formatJstDateKey(value)
}

function timeLabel(value: Date) {
  return formatJstTime(value)
}

function statusTitle(status: string) {
  if (status === 'pending') return '承認待ち'
  if (status === 'confirmed') return '確定'
  if (status === 'completed') return '完了'
  return 'キャンセル'
}

function inferBillingType(name: string, sessions: number): TrainerPlanBillingType {
  if (name.includes('月') || name.includes('月謝')) return 'monthly'
  return sessions > 1 ? 'ticket' : 'ticket'
}

export async function loadCustomerAppEntryData(
  trainerProfileId?: string | null
): Promise<CustomerAppEntryData | null> {
  const supabase = createAdminSupabaseClient()
  const safeTrainerId = trainerProfileId && /^[a-zA-Z0-9_-]{1,80}$/.test(trainerProfileId)
    ? trainerProfileId
    : null

  const query = supabase.from('trainer_profiles').select('id, user_id').limit(1)
  const { data: trainerProfile } = safeTrainerId
    ? await query.eq('id', safeTrainerId).maybeSingle()
    : await query.maybeSingle()

  if (!trainerProfile) return null

  const { data: trainerUser } = await supabase
    .from('users')
    .select('name')
    .eq('id', trainerProfile.user_id)
    .maybeSingle()

  return {
    trainer: {
      profileId: trainerProfile.id,
      name: trainerUser?.name ?? 'トレーナー',
    },
  }
}

async function getClientForCustomerApp() {
  const serverClient = await createServerSupabaseClient()
  const {
    data: { user },
  } = await serverClient.auth.getUser()

  if (user) {
    return { supabase: serverClient, userId: user.id, preview: false }
  }

  const customerSessionUserId = await getCustomerSessionUserId()
  if (customerSessionUserId) {
    return {
      supabase: createAdminSupabaseClient() as unknown as SupabaseAny,
      userId: customerSessionUserId,
      preview: false,
    }
  }

  if (!user && isDevAuthBypassEnabled() && process.env.FITALL_CUSTOMER_PREVIEW === '1') {
    return { supabase: createAdminSupabaseClient() as unknown as SupabaseAny, userId: null, preview: true }
  }

  return { supabase: serverClient, userId: null, preview: false }
}

async function resolveCustomerContext(supabase: SupabaseAny, userId: string | null) {
  if (userId) {
    const { data: currentUser } = await supabase
      .from('users')
      .select('id, name, email, role, line_user_id')
      .eq('id', userId)
      .maybeSingle()

    if (currentUser?.role === 'trainee') {
      const { data: traineeProfile } = await supabase
        .from('trainee_profiles')
        .select('id, user_id, goal')
        .eq('user_id', userId)
        .maybeSingle()

      const { data: relation } = traineeProfile
        ? await supabase
            .from('trainer_trainee')
            .select('trainer_id, trainee_id')
            .eq('trainee_id', traineeProfile.id)
            .eq('status', 'active')
            .limit(1)
            .maybeSingle()
        : { data: null }

      if (currentUser && traineeProfile && relation) {
        return {
          customerUser: currentUser,
          traineeProfile,
          trainerProfileId: relation.trainer_id,
          viewerRole: currentUser.role,
        }
      }
    }

    if (currentUser?.role === 'trainer') {
      const { data: trainerProfile } = await supabase
        .from('trainer_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()
      const { data: relation } = trainerProfile
        ? await supabase
            .from('trainer_trainee')
            .select('trainer_id, trainee_id')
            .eq('trainer_id', trainerProfile.id)
            .eq('status', 'active')
            .limit(1)
            .maybeSingle()
        : { data: null }

      if (relation?.trainee_id) {
        const { data: traineeProfile } = await supabase
          .from('trainee_profiles')
          .select('id, user_id, goal')
          .eq('id', relation.trainee_id)
          .maybeSingle()
        const { data: customerUser } = traineeProfile
          ? await supabase
              .from('users')
              .select('id, name, email, role, line_user_id')
              .eq('id', traineeProfile.user_id)
              .maybeSingle()
          : { data: null }
        if (customerUser && traineeProfile) {
          return {
            customerUser,
            traineeProfile,
            trainerProfileId: relation.trainer_id,
            viewerRole: currentUser.role,
          }
        }
      }
    }
  }
  return null
}

export async function loadCustomerAppMutationContext(): Promise<CustomerAppMutationContext | null> {
  const { supabase, userId, preview } = await getClientForCustomerApp()
  if (preview) return null

  const context = await resolveCustomerContext(supabase, userId)
  if (!context || context.viewerRole !== 'trainee' || context.customerUser.id !== userId) {
    return null
  }

  const adminSupabase = createAdminSupabaseClient() as unknown as SupabaseAny

  const { data: trainerProfile } = await adminSupabase
    .from('trainer_profiles')
    .select('id, user_id, bio')
    .eq('id', context.trainerProfileId)
    .maybeSingle()

  if (!trainerProfile) return null

  const { data: trainerUser } = await adminSupabase
    .from('users')
    .select('name, email, line_user_id')
    .eq('id', trainerProfile.user_id)
    .maybeSingle()

  return {
    supabase: adminSupabase,
    customerUser: context.customerUser,
    traineeProfile: context.traineeProfile,
    trainerProfile,
    trainerUser: trainerUser ?? null,
  }
}

async function loadCreditTickets(input: {
  supabase: SupabaseAny
  trainerId: string
  traineeId: string
  planMap: Record<string, CustomerMenu>
}) {
  const { data: credits, error } = await input.supabase
    .from('session_credits')
    .select('id, status, booking_id, expires_at, purchase_id')
    .eq('trainer_id', input.trainerId)
    .eq('trainee_id', input.traineeId)

  if (error || !credits?.length) return []

  const purchaseIds = [...new Set(credits.map((c) => c.purchase_id).filter(Boolean))]
  const { data: purchases } = purchaseIds.length
    ? await input.supabase
        .from('session_credit_purchases')
        .select('id, plan_id, quantity, amount, purchased_at')
        .in('id', purchaseIds)
    : { data: [] }
  const purchaseMap = Object.fromEntries((purchases ?? []).map((p) => [p.id, p]))
  const groups = new Map<string, typeof credits>()

  for (const credit of credits) {
    const key = credit.purchase_id ?? 'unknown'
    groups.set(key, [...(groups.get(key) ?? []), credit])
  }

  return Array.from(groups.entries()).map(([purchaseId, rows], index) => {
    const purchase = purchaseMap[purchaseId]
    const plan = purchase?.plan_id ? input.planMap[purchase.plan_id] : null
    const remaining = rows.filter((r) => r.status === 'available').length
    const scheduled = rows.filter((r) => r.status === 'scheduled').length
    const used = rows.filter((r) => r.status === 'used').length
    const total = rows.length
    const expiresAt = rows.find((r) => r.expires_at)?.expires_at
    const kind = plan?.billing_type ?? 'ticket'

    return {
      id: purchaseId || `credit-${index}`,
      title: plan?.name ?? '購入チケット',
      kind,
      remaining,
      scheduled,
      used,
      total,
      expiresLabel: expiresAt ? `${formatDateLabel(expiresAt)}まで` : kind === 'monthly' ? '月末まで' : '期限なし',
      note: kind === 'monthly' ? '毎月チケットを自動付与' : 'なくなったらLINEで追加案内',
    } satisfies CustomerTicket
  })
}

async function loadAvailability(trainerProfileId: string): Promise<CustomerAvailabilityDay[]> {
  const bookingData = await getPublicBookingData(trainerProfileId)
  const availableSlots = bookingData?.slots ?? []
  const byDate = new Map<string, { label: string; value: string }[]>()

  for (const slot of availableSlots) {
    const slotDate = new Date(slot.value)
    const key = dateKey(slotDate)
    byDate.set(key, [...(byDate.get(key) ?? []), { label: timeLabel(slotDate), value: slot.value }])
  }

  const displayTimes = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']
  return Array.from({ length: 14 }, (_, index) => {
    const key = addDaysToDateKey(formatJstDateKey(), index)
    const times = byDate.get(key) ?? []
    const cells = displayTimes.map((time) => {
      const hour = time.slice(0, 2)
      const availableInHour = times.find((candidate) => candidate.label.startsWith(`${hour}:`))
      return {
        time,
        status: availableInHour ? 'open' : 'closed',
        value: availableInHour?.value,
        availableLabel: availableInHour?.label,
      } satisfies CustomerAvailabilityCell
    })

    return {
      dateKey: key,
      dateLabel: formatJstDate(`${key}T00:00:00+09:00`, { month: 'numeric', day: 'numeric' }),
      weekday: formatJstDate(`${key}T00:00:00+09:00`, { weekday: 'short' }),
      openCount: cells.filter((cell) => cell.status === 'open').length,
      cells,
    }
  })
}

export async function loadCustomerAppData(): Promise<CustomerAppData | null> {
  const { supabase, userId, preview } = await getClientForCustomerApp()
  const context = await resolveCustomerContext(supabase, userId)
  if (!context) return null

  const { customerUser, traineeProfile, trainerProfileId } = context
  const { data: trainerProfile } = await supabase
    .from('trainer_profiles')
    .select('id, user_id, bio')
    .eq('id', trainerProfileId)
    .maybeSingle()
  const { data: trainerUser } = trainerProfile
    ? await supabase.from('users').select('name').eq('id', trainerProfile.user_id).maybeSingle()
    : { data: null }

  const { data: planRows } = await supabase
    .from('plans')
    .select('id, name, price, sessions')
    .eq('trainer_id', trainerProfileId)
    .order('created_at')

  const planSettings = readTrainerPlanSettingsFromBio(trainerProfile?.bio)
  const menus = (planRows ?? [])
    .map((plan, index) => {
      const meta = getPlanSettings(planSettings, plan.id, {
        billing_type: inferBillingType(plan.name, plan.sessions ?? 1),
        sort_order: index,
      })
      return {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        sessions: plan.sessions ?? 1,
        billing_type: meta.billing_type,
        description: meta.description,
        is_public: meta.is_public,
        sort_order: meta.sort_order || index,
      }
    })
    .filter((menu) => menu.is_public && menu.billing_type === 'ticket')
    .sort((a, b) => a.sort_order - b.sort_order)

  const { data: bookingRows } = await supabase
    .from('bookings')
    .select('id, scheduled_at, status, price')
    .eq('trainer_id', trainerProfileId)
    .eq('trainee_id', traineeProfile.id)
    .in('status', ['pending', 'confirmed', 'completed'])
    .order('scheduled_at', { ascending: true })

  const now = new Date()
  const bookings = (bookingRows ?? []).map((booking) => ({
    id: booking.id,
    scheduled_at: booking.scheduled_at,
    status: booking.status,
    price: booking.price,
    title: statusTitle(booking.status),
  }))
  const upcomingBookings = bookings.filter((booking) => new Date(booking.scheduled_at) >= now)
  const pastBookings = bookings.filter((booking) => new Date(booking.scheduled_at) < now).reverse()
  const planMap = Object.fromEntries(menus.map((menu) => [menu.id, menu]))

  const tickets = await loadCreditTickets({
    supabase,
    trainerId: trainerProfileId,
    traineeId: traineeProfile.id,
    planMap,
  })
  const availability = await loadAvailability(trainerProfileId)

  return {
    preview,
    customer: {
      id: customerUser.id,
      name: customerUser.name ?? 'お客様',
      email: customerUser.email ?? '',
      goal: traineeProfile.goal ?? '継続して体を整える',
      lineUserId: customerUser.line_user_id ?? null,
    },
    trainer: {
      name: trainerUser?.name ?? 'トレーナー',
      profileId: trainerProfileId,
    },
    viewer: {
      role: context.viewerRole ?? null,
      canConnectLine: context.viewerRole === 'trainee' && customerUser.id === userId,
    },
    tickets,
    upcomingBookings,
    pastBookings,
    availability,
    menus,
    purchaseUrl: `/book/${trainerProfileId}`,
  }
}

export function nextSuggestedBookingDate() {
  const next = addDays(new Date(), 7)
  return formatJstDate(next, {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  })
}
