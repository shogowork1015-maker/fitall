export const APP_TIME_ZONE = 'Asia/Tokyo'
export const JST_OFFSET = '+09:00'

const ymdFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function formatParts(date: Date) {
  const parts = Object.fromEntries(
    ymdFormatter.formatToParts(date).map((part) => [part.type, part.value])
  )
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  }
}

export function formatJstDateKey(value: Date | string = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  const parts = formatParts(date)
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

export function parseJstDateTime(dateKey: string, time: string) {
  const normalizedTime = time.length === 5 ? `${time}:00` : time
  return new Date(`${dateKey}T${normalizedTime}${JST_OFFSET}`)
}

export function parseJstDateTimeInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return new Date(Number.NaN)
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed)) return new Date(trimmed)
  return new Date(`${trimmed.length === 16 ? `${trimmed}:00` : trimmed}${JST_OFFSET}`)
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const date = parseJstDateTime(dateKey, '00:00')
  date.setUTCDate(date.getUTCDate() + days)
  return formatJstDateKey(date)
}

export function addMonthsToDateKey(dateKey: string, monthsToAdd: number) {
  const [year, month] = dateKey.split('-').map(Number)
  const monthIndex = year * 12 + (month - 1) + monthsToAdd
  const nextYear = Math.floor(monthIndex / 12)
  const nextMonth = (monthIndex % 12) + 1
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
}

export function dayOfWeekForDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

export function jstDayBounds(dateKey: string) {
  return {
    start: parseJstDateTime(dateKey, '00:00:00'),
    end: parseJstDateTime(dateKey, '23:59:59'),
  }
}

export function jstMonthBounds(dateKey: string = formatJstDateKey()) {
  const [year, month] = dateKey.split('-').map(Number)
  const startKey = `${year}-${String(month).padStart(2, '0')}-01`
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const nextMonthKey = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
  return {
    start: parseJstDateTime(startKey, '00:00:00'),
    end: new Date(parseJstDateTime(nextMonthKey, '00:00:00').getTime() - 1),
  }
}

export function formatJstDate(value: Date | string, options: Intl.DateTimeFormatOptions) {
  const date = value instanceof Date ? value : new Date(value)
  return date.toLocaleDateString('ja-JP', {
    timeZone: APP_TIME_ZONE,
    ...options,
  })
}

export function formatJstTime(value: Date | string, options?: Intl.DateTimeFormatOptions) {
  const date = value instanceof Date ? value : new Date(value)
  return date.toLocaleTimeString('ja-JP', {
    timeZone: APP_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  })
}

export function formatJstDateTime(value: Date | string, options: Intl.DateTimeFormatOptions) {
  const date = value instanceof Date ? value : new Date(value)
  return date.toLocaleString('ja-JP', {
    timeZone: APP_TIME_ZONE,
    ...options,
  })
}
