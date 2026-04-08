export const BOOKING_CANCEL_DEADLINE_HOURS = 24
export const BOOKING_OPEN_MONTHS = 1
export const RECURRING_PRESET_WINDOW_DAYS = 180

export function getBookingOpenUntil(from: Date = new Date()): Date {
  const d = new Date(from)
  d.setMonth(d.getMonth() + BOOKING_OPEN_MONTHS)
  return d
}
