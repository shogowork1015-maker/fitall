export interface TrainerOperationSettings {
  business_open: string
  business_close: string
  session_duration_minutes: number
}

const DEFAULT_SETTINGS: TrainerOperationSettings = {
  business_open: '09:00',
  business_close: '21:00',
  session_duration_minutes: 60,
}

interface StoredTrainerBio {
  fitall_settings?: Partial<TrainerOperationSettings>
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

export function buildTrainerBioWithSettings(
  currentBio: string | null | undefined,
  settings: TrainerOperationSettings
): string {
  let bio_text = ''
  if (currentBio) {
    try {
      const parsed = JSON.parse(currentBio) as StoredTrainerBio
      bio_text = parsed.bio_text ?? ''
    } catch {
      bio_text = currentBio
    }
  }
  return JSON.stringify({
    fitall_settings: normalizeSettings(settings),
    bio_text,
  })
}
