import { addDaysToDateKey, formatJstDate, formatJstDateKey, formatJstTime } from './datetime'
import type { PublicBookingSlot } from './public-booking'
import type { CustomerAvailabilityDay } from './customer-app'

// taken は、ほかの予約で埋まっている時刻（押せない枠として並べる）
export function customerAvailability(slots: PublicBookingSlot[], firstDay: string, taken: PublicBookingSlot[] = []): CustomerAvailabilityDay[] {
  const open = new Map(slots.map(slot => [slot.value, slot]))
  const closed = taken.filter(slot => !open.has(slot.value))
  return Array.from({ length: 29 }, (_, index) => {
    const dateKey = addDaysToDateKey(firstDay, index)
    const openCells = [...open.values()]
      .filter(slot => formatJstDateKey(slot.value) === dateKey)
      .map(slot => ({ time: formatJstTime(slot.value), status: 'open' as const, value: slot.value, availableLabel: formatJstTime(slot.value) }))
    const closedCells = [...new Map(closed.map(slot => [slot.value, slot])).values()]
      .filter(slot => formatJstDateKey(slot.value) === dateKey)
      .map(slot => ({ time: formatJstTime(slot.value), status: 'closed' as const, value: slot.value }))
    const cells = [...openCells, ...closedCells].sort((a, b) => Date.parse(a.value) - Date.parse(b.value))
    return { dateKey, dateLabel: formatJstDate(`${dateKey}T00:00:00+09:00`, { month: 'numeric', day: 'numeric' }),
      weekday: formatJstDate(`${dateKey}T00:00:00+09:00`, { weekday: 'short' }), openCount: openCells.length, cells }
  })
}
