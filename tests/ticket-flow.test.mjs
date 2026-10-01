import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

function load(file, dependencies) {
  const exports = {}
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(source, { exports, Date, Intl, Map, Error, console: { error() {} }, process: { env: {} }, require: key => {
    assert.ok(key in dependencies, `Unexpected dependency: ${key}`)
    return dependencies[key]
  } })
  return exports
}
const trainer = { profileId: 'trainer', userId: 'trainer-user', name: 'Trainer' }
const menu = { id: 'four', name: '4 tickets', price: 28000, sessions: 4, billing_type: 'ticket' }
function purchaseSetup(options = {}) {
  const calls = []
  const actions = load('src/app/book/[trainerId]/actions.ts', {
    'next/headers': { headers: async () => new Map([['host', 'localhost:3107']]) },
    '@/lib/public-booking': { getPublicBookingData: async () => ({ trainer, menus: [options.menu ?? menu], slots: [] }) },
    '@/lib/stripe': { createStripeCheckoutSession: async input => { calls.push(input); if (options.fail) throw Error('offline'); return { url: 'https://checkout.example.invalid' } } },
  })
  const form = new FormData()
  for (const [key, value] of Object.entries({ trainer_id: 'trainer', plan_id: 'four', customer_name: 'Sample', customer_email: 'sample@example.invalid', amount: '1', scheduled_at: '2030-01-01T00:00:00Z' })) form.set(key, value)
  return { run: () => actions.createPublicBookingCheckoutAction(null, form), calls, form }
}
test('purchase needs no slot, creates ticket-only checkout at server price and never reserves a time', async () => {
  const { run, calls } = purchaseSetup()
  assert.ok((await run()).checkoutUrl)
  assert.equal(calls[0].scheduledAt, undefined)
  assert.equal(calls[0].amount, 28000)
  assert.equal(calls[0].quantity, 4)
})
test('purchase rejects unavailable menu and invalid email without checkout', async () => {
  const unavailable = purchaseSetup({ menu: { ...menu, price: 0 } })
  assert.ok((await unavailable.run()).error)
  assert.equal(unavailable.calls.length, 0)
  const invalid = purchaseSetup(); invalid.form.set('customer_email', 'invalid')
  assert.ok((await invalid.run()).error)
  assert.equal(invalid.calls.length, 0)
})
test('checkout failure returns a recoverable error', async () => {
  assert.ok((await purchaseSetup({ fail: true }).run()).error)
})
function bookingSetup({ noSession = false, noCredit = false, creditConflict = false, notifyFail = false, available = true } = {}) {
  const calls = []; let notices = 0
  const supabase = { from(table) {
    const call = { table, filters: [] }; calls.push(call)
    const query = {
      select() { return query }, eq(key, value) { call.filters.push([key, value]); return query },
      is(key, value) { call.filters.push([key, value]); return query }, order() { return query }, limit() { return query },
      insert(value) { call.insert = value; return query }, update(value) { call.update = value; return query },
      maybeSingle: async () => ({ error: null, data: table === 'session_credits' ? ((noCredit || (creditConflict && call.update)) ? null : { id: 'credit' }) : { id: 'booking' } }),
      then(resolve) { return Promise.resolve({ error: null }).then(resolve) },
    }
    return query
  } }
  const actions = load('src/app/customer/app/bookings/actions.ts', {
    'next/cache': { revalidatePath() {} },
    '@/lib/customer-app': { loadCustomerAppMutationContext: async () => noSession ? null : ({ supabase, customerUser: { id: 'customer' }, traineeProfile: { id: 'trainee' }, trainerProfile: { id: 'trainer', bio: '' }, trainerUser: {} }) },
    '@/lib/public-booking': { isPublicSlotAvailable: async () => available },
    '@/lib/booking-overlap': { findTrainerBookingOverlap: async () => ({ overlaps: false }) },
    '@/lib/booking-notifications': { sendTicketBookingConfirmationNotifications: async () => { notices++; if (notifyFail) throw Error('offline') } },
  })
  const form = new FormData(); form.set('scheduled_at', new Date(Date.now() + 86400000).toISOString())
  return { run: () => actions.createCustomerBookingAction(null, form), calls, notices: () => notices }
}
test('ticket booking allocates one credit and never charges or writes a sale', async () => {
  const fixture = bookingSetup()
  assert.equal((await fixture.run()).status, 'success')
  assert.equal(fixture.calls.filter(call => call.insert).length, 1)
  assert.equal(fixture.calls.find(call => call.insert).insert.price, 0)
  const credit = fixture.calls.find(call => call.table === 'session_credits' && call.update)
  assert.equal(credit.update.status, 'scheduled')
  assert.equal(credit.update.booking_id, 'booking')
  assert.ok(credit.filters.some(([key,value]) => key === 'status' && value === 'available'))
  assert.ok(fixture.calls.every(call => ['bookings', 'session_credits'].includes(call.table)))
})
test('no session or no tickets cannot create a booking; exhausted tickets lead to purchase', async () => {
  const missing = bookingSetup({ noSession: true }); assert.equal((await missing.run()).status, 'error'); assert.equal(missing.calls.length, 0)
  const empty = bookingSetup({ noCredit: true }); assert.equal((await empty.run()).needsPurchase, true); assert.ok(empty.calls.every(call => !call.insert && !call.update))
})
test('unavailable slots leave tickets untouched', async () => {
  const fixture = bookingSetup({ available: false }); assert.equal((await fixture.run()).status, 'error'); assert.ok(fixture.calls.every(call => !call.insert && !call.update))
})
test('credit contention cancels the attempted booking and does not notify success', async () => {
  const fixture = bookingSetup({ creditConflict: true }); assert.equal((await fixture.run()).status, 'error')
  assert.ok(fixture.calls.some(call => call.table === 'bookings' && call.update?.status === 'cancelled'))
  assert.equal(fixture.notices(), 0)
})
test('notification failure after confirmed booking remains success to avoid a misleading retry', async () => {
  const result = await bookingSetup({ notifyFail: true }).run()
  assert.equal(result.status, 'success'); assert.match(result.message, /通知/)
})
test('customer availability retains half-hour and late-night starts across the full booking window', () => {
  const datetime = load('src/lib/datetime.ts', {})
  const { customerAvailability } = load('src/lib/customer-availability.ts', { './datetime': datetime })
  const values = ['2026-10-01T10:00:00+09:00', '2026-10-01T10:30:00+09:00', '2026-10-01T21:30:00+09:00', '2026-10-29T10:00:00+09:00']
  const days = customerAvailability(values.map(value => ({ value, label: '' })), '2026-10-01')
  assert.equal(days.length, 29); assert.equal(days[0].cells.length, 3); assert.equal(days[28].cells.length, 1)
  assert.equal(days[0].cells[1].value, values[1]); assert.equal(days[0].cells[2].time, '21:30')
})

function webhookSetup(failStage) {
  const queries = []; const issued = []
  const supabase = { from(table) {
    queries.push(table)
    assert.ok(['users', 'trainee_profiles', 'trainer_trainee'].includes(table), `Unexpected ${table} mutation`)
    const query = { select() { return query }, eq() { return query }, maybeSingle: async () => ({ data: { id: 'existing' }, error: null }) }
    return query
  } }
  const handler = load('src/app/api/stripe/webhook/route.ts', {
    crypto: { randomUUID: () => 'unused' },
    'next/headers': { headers: async () => new Map([['stripe-signature', 'mock']]) },
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    '@/lib/supabase-admin': { createAdminSupabaseClient: () => supabase },
    '@/lib/booking-holds': {}, '@/lib/booking-overlap': {}, '@/lib/booking-notifications': {},
    '@/lib/stripe': { verifyStripeSignature: () => true },
    '@/lib/session-credits': {
      planSessionQuantity: value => Number(value),
      ensureCreditPurchase: async () => { if (failStage === 'purchase') throw Error('session_credit_purchases missing'); return 'purchase' },
      ensureCreditsForPurchase: async input => { if (failStage === 'credits') throw Error('session_credits missing'); issued.push(input) },
    },
  })
  const event = { type: 'checkout.session.completed', data: { object: { id: 'checkout', payment_status: 'paid', amount_total: 28000,
    metadata: { trainer_profile_id: 'trainer', customer_name: 'Sample', customer_email: 'sample@example.invalid', amount: '28000', quantity: '4' } } } }
  return { run: () => handler.POST({ text: async () => JSON.stringify(event) }), issued, queries }
}
test('ticket-only webhook issues credits without creating or notifying any reservation', async () => {
  const fixture = webhookSetup()
  assert.equal((await fixture.run()).status, 200)
  assert.equal(fixture.issued[0].quantity, 4)
})
for (const stage of ['purchase', 'credits']) {
  test(`ticket-only webhook reports failure if ${stage} storage fails instead of acknowledging lost tickets`, async () => {
    assert.equal((await webhookSetup(stage).run()).status, 500)
  })
}
