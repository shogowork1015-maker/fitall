// Isolated PostgreSQL only. Never reads .env or accepts a database URL.
// node scripts/test-booking-concurrency.mjs /tmp/fitall-concurrency-db/node_modules
import assert from 'node:assert/strict'
import { testCustomerBookingChanges } from './test-customer-booking-changes.mjs'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
const requireRuntime = createRequire(join(resolve(process.argv[2]), 'runtime.cjs'))
const { default: EmbeddedPostgres } = await import(pathToFileURL(requireRuntime.resolve('embedded-postgres')))
const dir = await mkdtemp(join(tmpdir(), 'fitall-concurrency-'))
const pg = new EmbeddedPostgres({ databaseDir: join(dir, 'db'), port: 55439,
  user: 'postgres', password: 'isolated-test-only', persistent: true,
  autoRehydrateSymlinks: true, postgresFlags: ['-c', 'listen_addresses=127.0.0.1'],
  onLog() {}, onError() {} })
const clients = []
async function connect() { const c = pg.getPgClient(); await c.connect(); clients.push(c); return c }
const migration = await readFile(new URL('../supabase/migrations/20261103110747_atomic_tickets_and_booking_ranges.sql', import.meta.url), 'utf8')
const trainer = '10000000-0000-0000-0000-000000000001'
const trainee = '20000000-0000-0000-0000-000000000001'
const purchase = '30000000-0000-0000-0000-000000000001'
try {
  await pg.initialise(); await pg.start()
  const c = await connect()
  await c.query(`
    create role anon; create role authenticated; create role service_role;
    create table trainer_profiles(id uuid primary key, bio text);
    create table trainee_profiles(id uuid primary key);
    create table trainer_trainee(trainer_id uuid, trainee_id uuid, status text);
    create table bookings(id uuid primary key default gen_random_uuid(), trainer_id uuid references trainer_profiles,
      trainee_id uuid references trainee_profiles, scheduled_at timestamptz not null, status text, price integer);
    create table session_credit_purchases(id uuid primary key, trainer_id uuid, trainee_id uuid, quantity integer, status text);
    create table session_credits(id uuid primary key default gen_random_uuid(), purchase_id uuid references session_credit_purchases,
      trainer_id uuid, trainee_id uuid, booking_id uuid unique references bookings, status text, expires_at timestamptz,
      created_at timestamptz default now());
  `)
  await c.query('insert into trainer_profiles values ($1,null);', [trainer])
  await c.query('insert into trainee_profiles values ($1)', [trainee])
  await c.query("insert into trainer_trainee values ($1,$2,'active')", [trainer, trainee])
  // Existing conflicts must abort without deleting or cancelling anything.
  await c.query("insert into bookings(trainer_id,trainee_id,scheduled_at,status) values ($1,$2,'2035-01-01 10:00Z','confirmed'),($1,$2,'2035-01-01 10:30Z','pending')", [trainer, trainee])
  await assert.rejects(c.query(migration), e => e.code === '23P01')
  await c.query('rollback')
  assert.equal((await c.query('select count(*)::int n from bookings')).rows[0].n, 2)
  assert.equal((await c.query("select count(*)::int n from information_schema.columns where table_name='bookings' and column_name='occupied_range'")).rows[0].n, 0)
  await c.query('delete from bookings') // Own synthetic fixture only.
  await c.query(migration)
  console.log('PASS migration rolls back on existing overlaps without data loss')
  await c.query("insert into session_credit_purchases values ($1,$2,$3,4,'paid')", [purchase, trainer, trainee])
  const workers = await Promise.all(Array.from({ length: 8 }, connect))
  const issue = client => client.query('select * from fitall_ensure_purchase_credits($1,$2,$3,4)', [purchase, trainer, trainee])
  await Promise.all(workers.map(issue))
  assert.equal((await c.query('select count(*)::int n from session_credits')).rows[0].n, 4)
  await assert.rejects(c.query('select * from fitall_ensure_purchase_credits($1,$2,$3,5)', [purchase, trainer, trainee]))
  assert.equal((await c.query('select count(*)::int n from session_credits')).rows[0].n, 4)
  console.log('PASS 8 concurrent webhook deliveries issue exactly 4 tickets; metadata mismatch rejected')
  const book = (client, at) => client.query('select fitall_book_customer_ticket($1,$2,$3) id', [trainer, trainee, at])
  const results = await Promise.allSettled(workers.map((w,i) => book(w, i % 2 ? '2035-01-02 10:30Z' : '2035-01-02 10:00Z')))
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1)
  assert.equal((await c.query("select count(*)::int n from session_credits where status='scheduled'")).rows[0].n, 1)
  assert.equal((await c.query('select count(*)::int n from bookings')).rows[0].n, 1)
  console.log('PASS concurrent same/overlapping slots leave one booking and one consumed ticket')
  const winner = (await c.query('select id, upper(occupied_range) ending from bookings')).rows[0]
  await book(c, winner.ending)
  console.log('PASS exact end boundary permits adjacent booking')
  const first = (await c.query('select id, scheduled_at from bookings order by scheduled_at')).rows[0]
  const last = (await c.query('select id, scheduled_at from bookings order by scheduled_at desc')).rows[0]
  await assert.rejects(c.query('update bookings set scheduled_at=$1 where id=$2', [first.scheduled_at, last.id]), e => e.code === '23P01')
  console.log('PASS trainer-style reschedule cannot overlap an existing booking')
  // With one remaining ticket, two non-overlapping reservations still cannot spend it twice.
  await c.query("update session_credits set status='expired' where status='available' and id=(select id from session_credits where status='available' limit 1)")
  const one = await Promise.allSettled([book(workers[0], '2035-01-03 10:00Z'), book(workers[1], '2035-01-03 14:00Z')])
  assert.equal(one.filter(r => r.status === 'fulfilled').length, 1)
  assert.equal((await c.query("select count(*)::int n from session_credits where status='scheduled'")).rows[0].n, 3)
  console.log('PASS two different slots cannot consume the same final ticket')
  // Fail after booking INSERT to prove that a ticket failure rolls the booking back.
  await c.query("update session_credits set status='available' where status='expired'")
  await c.query(`create function fail_ticket_update() returns trigger language plpgsql as $$ begin raise exception 'synthetic storage failure'; end $$;
    create trigger fail_ticket before update on session_credits for each row execute function fail_ticket_update();`)
  await assert.rejects(book(c, '2035-01-04 10:00Z'))
  assert.equal((await c.query('select count(*)::int n from bookings')).rows[0].n, 3)
  await c.query('drop trigger fail_ticket on session_credits')
  console.log('PASS ticket update failure rolls back booking INSERT')
  for (const role of ['anon','authenticated']) {
    await c.query(`set role ${role}`)
    await assert.rejects(issue(c), e => e.code === '42501')
    await assert.rejects(book(c,'2035-01-04 10:00Z'), e => e.code === '42501')
    await c.query('reset role')
  }
  console.log('PASS anonymous and authenticated roles cannot call privileged RPCs')
  await c.query("update session_credits set expires_at=now()-interval '1 day' where status='available'")
  await assert.rejects(book(c,'2035-01-04 10:00Z'), e => e.code === 'P0002')
  console.log('PASS expired ticket cannot be reserved')
  await issue(c)
  assert.equal((await c.query('select count(*)::int n from session_credits')).rows[0].n, 4)
  assert.equal((await c.query("select count(*)::int n from session_credits where status='scheduled'")).rows[0].n, 3)
  console.log('PASS redelivery after consumption preserves balances and associations')
  await c.query("update session_credit_purchases set status='refunded'")
  await assert.rejects(issue(c))
  await c.query("update session_credit_purchases set status='paid'")
  await c.query('grant usage on schema public to service_role; grant select,insert,update on all tables in schema public to service_role')
  await c.query('set role service_role'); await issue(c); await c.query('reset role')
  await c.query('begin; set local role service_role')
  await c.query("update session_credits set expires_at=null where status='available'")
  await book(c, '2035-01-05 10:00Z')
  await c.query('rollback')
  console.log('PASS service-role issuance and booking succeed; refunded purchase cannot issue')
  // Changing future menu duration must not shorten an existing booking interval.
  await c.query('update trainer_profiles set bio=$1', [JSON.stringify({ fitall_settings: { session_duration_minutes: 30 } })])
  await c.query("update bookings set occupied_range=tstzrange(scheduled_at,scheduled_at+interval '1 minute','[)') where id=$1", [first.id])
  assert.equal((await c.query('select extract(epoch from upper(occupied_range)-lower(occupied_range))::int seconds from bookings where id=$1', [first.id])).rows[0].seconds, 3600)
  await c.query("update bookings set status='cancelled' where id=$1", [first.id])
  await c.query("update session_credits set status='available', booking_id=null, expires_at=null where booking_id=$1", [first.id])
  await book(c, first.scheduled_at)
  assert.equal((await c.query("select extract(epoch from upper(occupied_range)-lower(occupied_range))::int seconds from bookings where status='confirmed' and scheduled_at=$1", [first.scheduled_at])).rows[0].seconds, 1800)
  console.log('PASS cancellation frees interval; existing duration retained and new duration applied')

  await testCustomerBookingChanges(c, workers, trainer, trainee)
} finally {
  await Promise.allSettled(clients.map(c => c.end()))
  await pg.stop()
}
