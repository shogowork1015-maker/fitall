import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
function load(file, dependencies = {}) {
  const exports = {}
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(source, { exports, Date, Error, require(key) { assert.ok(key in dependencies, key); return dependencies[key] } })
  return exports
}
const intervals = load('src/lib/booking-interval.ts')
const settings = load('src/lib/trainer-settings.ts')
const { findTrainerBookingOverlap } = load('src/lib/booking-overlap.ts', { './booking-interval': intervals, './trainer-settings': settings })
const credits = load('src/lib/session-credits.ts')
test('stored range preserves timezone and rejects missing, empty or malformed intervals', () => {
  const range = intervals.readBookingInterval('["2035-01-01 10:00:00+09","2035-01-01 12:00:00+09")')
  assert.equal(range.start.toISOString(), '2035-01-01T01:00:00.000Z')
  assert.equal(range.end.getTime()-range.start.getTime(), 7200000)
  for (const invalid of [null, 'empty', '[,)', '[bad,bad)', '[2035-01-01,2034-01-01)']) assert.throws(() => intervals.readBookingInterval(invalid))
})
test('moving a booking checks its saved duration, not new trainer settings', async () => {
  const calls = []
  const supabase = { from() {
    const q = { select() { return q }, eq() { return q }, in() { return q }, neq() { return q }, limit() { return q },
      overlaps(k,v) { calls.push([k,v]); return q },
      maybeSingle: async () => ({ data: { occupied_range: '["2035-01-01 10:00:00+00","2035-01-01 12:00:00+00")' }, error: null }),
      then(resolve) { return Promise.resolve({ data: [], error: null }).then(resolve) },
    }; return q
  } }
  const result = await findTrainerBookingOverlap({ supabase, trainerId:'t', trainerBio:JSON.stringify({fitall_settings:{session_duration_minutes:30}}), scheduledAt:'2035-02-01T10:00:00Z', excludeBookingId:'b' })
  assert.equal(result.sessionMs,7200000)
  assert.deepEqual(calls, [['occupied_range','[2035-02-01T10:00:00.000Z,2035-02-01T12:00:00.000Z)']])
})
test('ticket issuance cannot fall back to non-atomic inserts when RPC missing or malformed', async () => {
  for (const response of [{error:{message:'function missing'},data:null}, {error:null,data:[]}]) {
    const supabase = { rpc: async () => response, from() { assert.fail('unsafe fallback') } }
    await assert.rejects(credits.ensureCreditsForPurchase({supabase,purchaseId:'p',trainerId:'t',traineeId:'c',quantity:4}))
  }
})
test('legacy credit attachment cannot overwrite a ticket another request reserved', async () => {
  for (const method of ['attachFirstAvailableCreditToBooking','attachFirstAvailableCreditForCustomerToBooking']) {
    let n=0; const filters=[]
    const supabase={from(){ const index=n++; const q={select(){return q},eq(k,v){if(index===2)filters.push([k,v]);return q},is(k,v){if(index===2)filters.push([k,v]);return q},order(){return q},limit(){return q},update(){return q},maybeSingle:async()=>({data:index===1?{id:'credit'}:null,error:null})};return q}}
    await assert.rejects(credits[method]({supabase,purchaseId:'p',trainerId:'t',traineeId:'c',bookingId:'b'}), /already reserved/)
    assert.deepEqual(filters,[['id','credit'],['status','available'],['booking_id',null]])
  }
})
test('purchase lookup failure never creates a second purchase', async () => {
  const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:null,error:{message:'offline'}})}
  await assert.rejects(credits.ensureCreditPurchase({supabase:{from:()=>q}}),/lookup failed/)
})
