// PostgreSQL serializes finite tstzrange bounds with optional quotes.
export function readBookingInterval(range: unknown) {
  if (typeof range !== 'string') throw new Error('Booking interval is missing')
  const match = /^\["?([^",]+)"?,"?([^",]+)"?\)$/.exec(range)
  if (!match) throw new Error('Booking interval is invalid')
  const start = new Date(match[1])
  const end = new Date(match[2])
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    throw new Error('Booking interval is invalid')
  }
  return { start, end }
}
