import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

function load(path, dependencies = {}) {
  const testModule = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(code, { module: testModule, exports: testModule.exports, require: name => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`)
    return dependencies[name]
  }, Intl, Date, Map })
  return testModule.exports
}
const datetime = load('src/lib/datetime.ts')
const { bookingDays, selectedBookingSlot } = load('src/lib/booking-selection.ts', { './datetime': datetime })
const slot = value => ({ value, label: value })
const slots = [slot('2026-10-01T01:30:00Z'), slot('2026-10-01T01:00:00Z'), slot('2026-10-03T01:00:00Z')]

test('all exact starts in one hour remain independently bookable and sorted', () => {
  const days = bookingDays(slots)
  assert.equal(days[0].slots.length, 2)
  assert.equal(days[0].slots[0].value, '2026-10-01T01:00:00Z')
  assert.equal(days[0].slots[1].value, '2026-10-01T01:30:00Z')
})
test('dates without availability remain empty rather than borrowing another day', () => {
  const days = bookingDays(slots)
  assert.equal(days.length, 3)
  assert.equal(days[1].dateKey, '2026-10-02')
  assert.equal(days[1].slots.length, 0)
  assert.equal(selectedBookingSlot(slots, days[1].dateKey, slots[0].value), null)
})
test('initial or cleared selection never silently defaults to the first slot', () => {
  assert.equal(selectedBookingSlot(slots, '2026-10-01', ''), null)
  assert.equal(selectedBookingSlot(slots, '2026-10-03', slots[0].value), null)
})
test('selection retains the exact half-hour ISO value; removed availability invalidates it', () => {
  assert.equal(selectedBookingSlot(slots, '2026-10-01', slots[0].value).value, slots[0].value)
  assert.equal(selectedBookingSlot(slots.slice(1), '2026-10-01', slots[0].value), null)
})
test('JST midnight and year crossing work regardless of the host timezone', () => {
  const days = bookingDays([slot('2026-12-31T15:30:00Z'), slot('2026-12-31T14:30:00Z')])
  assert.equal(days[0].dateKey, '2026-12-31')
  assert.equal(days[1].dateKey, '2027-01-01')
  assert.equal(selectedBookingSlot(days[1].slots, '2027-01-01', '2026-12-31T15:30:00Z').value, '2026-12-31T15:30:00Z')
})
test('empty, invalid and identical duplicate slots do not generate phantom availability', () => {
  assert.equal(bookingDays([]).length, 0)
  assert.equal(bookingDays([slot('invalid')]).length, 0)
  assert.equal(bookingDays([slots[0], slots[0]])[0].slots.length, 1)
})
