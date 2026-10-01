import { addDaysToDateKey, formatJstDateKey } from './datetime'
import type { PublicBookingSlot } from './public-booking'

/** Keep every exact start time, including multiple starts in the same hour. */
export function bookingDays(slots: PublicBookingSlot[]) {
  const sorted = [...new Map(slots.map(slot => [slot.value, slot])).values()]
    .filter(slot => Number.isFinite(Date.parse(slot.value)))
    .sort((a, b) => Date.parse(a.value) - Date.parse(b.value))
  if (!sorted.length) return []
  const lastDay = formatJstDateKey(sorted[sorted.length - 1].value)
  const days: { dateKey: string; slots: PublicBookingSlot[] }[] = []
  for (let dateKey = formatJstDateKey(sorted[0].value); dateKey <= lastDay; dateKey = addDaysToDateKey(dateKey, 1)) {
    days.push({ dateKey, slots: sorted.filter(slot => formatJstDateKey(slot.value) === dateKey) })
  }
  return days
}

/** Never substitute a different reservation when browsing dates. */
export function selectedBookingSlot(slots: PublicBookingSlot[], dateKey: string, value: string) {
  return slots.find(slot => slot.value === value && formatJstDateKey(slot.value) === dateKey) ?? null
}
