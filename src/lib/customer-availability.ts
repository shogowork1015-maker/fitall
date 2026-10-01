import { addDaysToDateKey, formatJstDate, formatJstDateKey, formatJstTime } from './datetime'
import type { PublicBookingSlot } from './public-booking'
import type { CustomerAvailabilityDay } from './customer-app'

export function customerAvailability(slots: PublicBookingSlot[], firstDay: string): CustomerAvailabilityDay[] {
  return Array.from({ length: 29 }, (_, index) => {
    const dateKey = addDaysToDateKey(firstDay, index)
    const cells = [...new Map(slots.map(slot => [slot.value, slot])).values()]
      .filter(slot => formatJstDateKey(slot.value) === dateKey)
      .sort((a, b) => Date.parse(a.value) - Date.parse(b.value))
      .map(slot => ({ time: formatJstTime(slot.value), status: 'open' as const, value: slot.value, availableLabel: formatJstTime(slot.value) }))
    return { dateKey, dateLabel: formatJstDate(`${dateKey}T00:00:00+09:00`, { month: 'numeric', day: 'numeric' }),
      weekday: formatJstDate(`${dateKey}T00:00:00+09:00`, { weekday: 'short' }), openCount: cells.length, cells }
  })
}
