import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import path from 'node:path'

// Execute the real server actions against a deterministic query double. No network/env access.
const source = fs.readFileSync(path.join(import.meta.dirname, '../src/app/trainer/bookings/actions.ts'), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
function setup(responses, { user = { id: 'user-1' } } = {}) {
  const calls = []
  const remaining = [...responses]
  const supabase = {
    auth: { getUser: async () => ({ data: { user } }) },
    from(table) {
      const call = { table, filters: [] }
      calls.push(call)
      const result = () => {
        assert.ok(remaining.length, `Unexpected query to ${table}`)
        return remaining.shift()
      }
      const query = {
        select() { return query },
        update(value) { call.update = value; return query },
        insert(value) { call.insert = value; return query },
        eq(key, value) { call.filters.push([key, value]); return query },
        in() { return query },
        maybeSingle: async () => result(),
        then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject) },
      }
      return query
    },
  }
  const exports = {}
  vm.runInNewContext(compiled, {
    exports,
    console: { error() {} },
    require(name) {
      if (name === '@/lib/supabase-server') return { createServerSupabaseClient: async () => supabase }
      if (name === 'next/cache') return { revalidatePath() {} }
      if (name === '@/lib/supabase-admin') return { createAdminSupabaseClient() { throw Error('Unexpected notification attempt') } }
      if (name === '@/lib/booking-notifications') return { sendTicketDepletedNotification() { throw Error('Unexpected send') } }
      if (name === '@/lib/booking-overlap' || name === '@/lib/datetime') return {}
      throw Error(`Unexpected dependency ${name}`)
    },
  })
  return { actions: exports, calls, remaining }
}
const profile = { data: { id: 'trainer-1' }, error: null }
const booking = { data: { id: 'booking-1', trainer_id: 'trainer-1', price: 8800 }, error: null }
for (const name of ['approveBooking', 'rejectBooking', 'completeBooking']) {
  test(`${name}: missing authentication returns error without mutation`, async () => {
    const { actions, calls } = setup([], { user: null })
    assert.ok((await actions[name]('booking-1')).error)
    assert.equal(calls.length, 0)
  })
  test(`${name}: database failure cannot report success`, async () => {
    const { actions, calls } = setup([profile, { data: null, error: { message: 'denied' } }])
    assert.ok((await actions[name]('booking-1')).error)
    assert.ok(calls[1].filters.some(([key, value]) => key === 'trainer_id' && value === 'trainer-1'))
    assert.equal(calls.length, 2)
  })
  test(`${name}: zero affected rows cannot report success`, async () => {
    const { actions, calls } = setup([profile, { data: null, error: null }])
    assert.ok((await actions[name]('not-owned')).error)
    assert.equal(calls.length, 2)
  })
}
test('approval: failed sales lookup yields partial-success warning and never inserts a duplicate', async () => {
  const { actions, calls } = setup([profile, booking, { data: null, error: { message: 'offline' } }])
  const result = await actions.approveBooking('booking-1')
  assert.ok(result.warning)
  assert.equal(result.error, undefined)
  assert.equal(calls.some((call) => call.insert), false)
})
test('approval: existing sale is not inserted again', async () => {
  const { actions, calls } = setup([profile, booking, { data: { id: 'sale-1' }, error: null }])
  const result = await actions.approveBooking('booking-1')
  assert.equal(result.error, undefined)
  assert.equal(result.warning, undefined)
  assert.equal(calls.some((call) => call.insert), false)
})
for (const name of ['rejectBooking', 'completeBooking']) {
  test(`${name}: credit update failure yields a warning`, async () => {
    const { actions } = setup([profile, booking, { data: null, error: { message: 'offline' } }])
    const result = await actions[name]('booking-1')
    assert.ok(result.warning)
    assert.equal(result.error, undefined)
  })
  test(`${name}: confirmed updates return no error or warning`, async () => {
    const { actions, remaining } = setup([profile, booking, { data: null, error: null }])
    const result = await actions[name]('booking-1')
    assert.equal(result.error, undefined)
    assert.equal(result.warning, undefined)
    assert.equal(remaining.length, 0)
  })
}
