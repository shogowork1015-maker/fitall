export interface TrainerOperationSettings {
  business_open: string
  business_close: string
  session_duration_minutes: number
}

export type TrainerPlanBillingType = 'ticket' | 'monthly'

export interface TrainerPlanSettings {
  billing_type: TrainerPlanBillingType
  description: string
  is_public: boolean
  sort_order: number
}

const DEFAULT_SETTINGS: TrainerOperationSettings = {
  business_open: '09:00',
  business_close: '21:00',
  session_duration_minutes: 60,
}

const DEFAULT_PLAN_SETTINGS: TrainerPlanSettings = {
  billing_type: 'ticket',
  description: '',
  is_public: true,
  sort_order: 0,
}

interface StoredTrainerBio {
  fitall_settings?: Partial<TrainerOperationSettings>
  fitall_plan_settings?: Record<string, Partial<TrainerPlanSettings>>
  bio_text?: string
}

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-4]):[0-5]\d$/.test(value)
}

function normalizeSettings(input?: Partial<TrainerOperationSettings>): TrainerOperationSettings {
  const business_open =
    input?.business_open && isValidTime(input.business_open)
      ? input.business_open
      : DEFAULT_SETTINGS.business_open
  const business_close =
    input?.business_close && isValidTime(input.business_close)
      ? input.business_close
      : DEFAULT_SETTINGS.business_close
  const session_duration_minutes =
    input?.session_duration_minutes && [30, 45, 60, 75, 90, 120].includes(input.session_duration_minutes)
      ? input.session_duration_minutes
      : DEFAULT_SETTINGS.session_duration_minutes

  return { business_open, business_close, session_duration_minutes }
}

export function readTrainerSettingsFromBio(bio: string | null | undefined): TrainerOperationSettings {
  if (!bio) return DEFAULT_SETTINGS
  try {
    const parsed = JSON.parse(bio) as StoredTrainerBio
    return normalizeSettings(parsed.fitall_settings)
  } catch {
    return DEFAULT_SETTINGS
  }
}

function normalizePlanSettings(input?: Partial<TrainerPlanSettings>): TrainerPlanSettings {
  const billing_type = input?.billing_type === 'monthly' ? 'monthly' : DEFAULT_PLAN_SETTINGS.billing_type
  const description = typeof input?.description === 'string' ? input.description.slice(0, 180) : ''
  const is_public = typeof input?.is_public === 'boolean' ? input.is_public : true
  const sort_order =
    typeof input?.sort_order === 'number' && Number.isFinite(input.sort_order)
      ? Math.max(0, Math.floor(input.sort_order))
      : 0

  return { billing_type, description, is_public, sort_order }
}

function readStoredBio(currentBio: string | null | undefined): StoredTrainerBio {
  if (!currentBio) return {}
  try {
    const parsed = JSON.parse(currentBio) as StoredTrainerBio
    return {
      fitall_settings: parsed.fitall_settings,
      fitall_plan_settings: parsed.fitall_plan_settings,
      bio_text: parsed.bio_text ?? '',
    }
  } catch {
    return { bio_text: currentBio }
  }
}

export function readTrainerPlanSettingsFromBio(
  bio: string | null | undefined
): Record<string, TrainerPlanSettings> {
  const stored = readStoredBio(bio)
  const entries = Object.entries(stored.fitall_plan_settings ?? {})
  return Object.fromEntries(entries.map(([id, value]) => [id, normalizePlanSettings(value)]))
}

export function getPlanSettings(
  map: Record<string, TrainerPlanSettings>,
  planId: string,
  fallback?: Partial<TrainerPlanSettings>
): TrainerPlanSettings {
  return normalizePlanSettings(map[planId] ?? fallback)
}

export function buildTrainerBioWithSettings(
  currentBio: string | null | undefined,
  settings: TrainerOperationSettings
): string {
  const stored = readStoredBio(currentBio)
  return JSON.stringify({
    fitall_settings: normalizeSettings(settings),
    fitall_plan_settings: stored.fitall_plan_settings ?? {},
    bio_text: stored.bio_text ?? '',
  })
}

export function buildTrainerBioWithPlanSettings(
  currentBio: string | null | undefined,
  planId: string,
  settings: Partial<TrainerPlanSettings> | null
): string {
  const stored = readStoredBio(currentBio)
  const planSettings = { ...(stored.fitall_plan_settings ?? {}) }

  if (settings === null) {
    delete planSettings[planId]
  } else {
    planSettings[planId] = normalizePlanSettings(settings)
  }

  return JSON.stringify({
    fitall_settings: normalizeSettings(stored.fitall_settings),
    fitall_plan_settings: planSettings,
    bio_text: stored.bio_text ?? '',
  })
}
