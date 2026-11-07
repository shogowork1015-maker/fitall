// Invoked by the isolated concurrency suite, never connects to an external DB.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
export async function testCustomerBookingChanges(c, workers, trainer, trainee) {
  await c.query(await readFile(new URL('../supabase/migrations/20261104010941_customer_booking_changes.sql', import.meta.url), 'utf8'))
  const change = (client, id, oldAt, newAt = null, owner = trainee) => client.query(
    'select fitall_change_customer_booking($1,$2,$3,$4,$5) result', [trainer, owner, id, oldAt, newAt])
  const at = day => `2038-01-${String(day).padStart(2,'0')}T10:00:00.000Z`
  const fixture = async (date) => {
    const { rows: [b] } = await c.query("insert into bookings(trainer_id,trainee_id,scheduled_at,status,price) values($1,$2,$3,'confirmed',0) returning id", [trainer,trainee,date])
    await c.query("insert into session_credits(purchase_id,trainer_id,trainee_id,booking_id,status) select id,$1,$2,$3,'scheduled' from session_credit_purchases limit 1", [trainer,trainee,b.id])
    return b.id
  }
  const b = await fixture(at(1))
  await assert.rejects(change(c,b,at(1),null,'20000000-0000-0000-0000-000000000002'), e=>e.code==='P0002')
  const before = (await c.query('select count(*)::int n from session_credits')).rows[0].n
  const cancels = await Promise.all(workers.map(w=>change(w,b,at(1))))
  assert.equal(cancels.filter(r=>r.rows[0].result==='returned').length,1)
  assert.equal(cancels.filter(r=>r.rows[0].result==='already_cancelled').length,7)
  assert.equal((await c.query('select count(*)::int n from session_credits')).rows[0].n,before)
  assert.equal((await c.query('select count(*)::int n from session_credits where booking_id=$1',[b])).rows[0].n,0)
  for (const [status, oldStatus] of [['confirmed','pending'],['completed','confirmed']]) {
    const stale = await c.query('update bookings set status=$1 where id=$2 and status=$3 returning id',[status,b,oldStatus])
    assert.equal(stale.rowCount,0)
  }
  assert.equal((await c.query("update bookings set scheduled_at=$1,status='confirmed' where id=$2 and status='confirmed' and scheduled_at=$3 returning id",[at(8),b,at(1)])).rowCount,0)
  console.log('PASS stale trainer approve/complete/move cannot resurrect a cancelled booking')
  console.log('PASS customer ownership and 8 simultaneous cancellations return exactly one existing ticket')
  const expired = await fixture(at(2))
  await c.query("update session_credits set expires_at=now()-interval '1 day' where booking_id=$1",[expired])
  assert.equal((await change(c,expired,at(2))).rows[0].result,'returned_expired')
  const near = new Date(Date.now()+23*3600000).toISOString()
  const late = await fixture(near)
  await assert.rejects(change(c,late,near),e=>e.code==='P0005')
  const moving = await fixture(at(3))
  const other = await fixture(at(4))
  await assert.rejects(change(c,moving,at(3),at(4)),e=>e.code==='23P01')
  assert.equal((await c.query('select scheduled_at from bookings where id=$1',[moving])).rows[0].scheduled_at.toISOString(),at(3))
  const creditBefore = (await c.query('select * from session_credits where booking_id=$1',[moving])).rows[0]
  await assert.rejects(change(c,moving,at(3),near),e=>e.code==='P0005')
  assert.equal((await change(c,moving,at(3),at(5))).rows[0].result,'rescheduled')
  assert.deepEqual((await c.query('select * from session_credits where booking_id=$1',[moving])).rows[0],creditBefore)
  await assert.rejects(change(c,moving,at(3)),e=>e.code==='P0003')
  const race = await Promise.allSettled([change(workers[0],moving,at(5),at(6)),change(workers[1],moving,at(5))])
  assert.equal(race.filter(r=>r.status==='fulfilled').length,1)
  console.log('PASS cutoff, expired return, move conflict rollback, retained ticket, stale and simultaneous move/cancel')
  // Simulate storage failure after booking update: both records must roll back.
  await c.query(`create trigger fail_ticket before update on session_credits for each row execute function fail_ticket_update()`)
  await assert.rejects(change(c,other,at(4)))
  assert.equal((await c.query('select status from bookings where id=$1',[other])).rows[0].status,'confirmed')
  assert.equal((await c.query('select status from session_credits where booking_id=$1',[other])).rows[0].status,'scheduled')
  await c.query('drop trigger fail_ticket on session_credits')
  for (const role of ['anon','authenticated']) {
    await c.query(`set role ${role}`)
    await assert.rejects(change(c,other,at(4)),e=>e.code==='42501')
    await c.query('reset role')
  }
  await c.query('set role service_role')
  assert.equal((await change(c,other,at(4))).rows[0].result,'returned')
  await c.query('reset role')
  console.log('PASS atomic cancellation rollback and service-only execution')
}
