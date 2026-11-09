import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

function load(file, dependencies = {}) {
  const exports = {}
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
  }).outputText
  vm.runInNewContext(source, { exports, Date, Intl, Map, Set, Error, require: key => {
    assert.ok(key in dependencies, `Unexpected dependency: ${key}`)
    return dependencies[key]
  } })
  return exports
}
const revenue = load('src/lib/trainer-revenue.ts')
const trainerSettings = load('src/lib/trainer-settings.ts')
// チケットの残り・名前は本物の読み込み処理を使う（偽のDBから読む）
const ticketSummary = load('src/lib/ticket-summary.ts', { './datetime': load('src/lib/datetime.ts') })
// 画面が使う共通UI部品は本物を読み込み、画面の描画結果まで確認できるようにする
// CSSモジュールはクラス名をそのまま返す
const cssModule = { default: new Proxy({}, { get: (_, key) => String(key) }) }
const uiDependencies = (jsxRuntime, link) => {
  const base = { 'react/jsx-runtime': jsxRuntime, 'next/link': link, './ui.module.css': cssModule }
  const icons = load('src/ui/icons.tsx', base)
  const withIcons = { ...base, './icons': icons }
  return {
    '@/ui/icons': icons,
    '@/ui/Screen': load('src/ui/Screen.tsx', withIcons),
    '@/ui/List': load('src/ui/List.tsx', withIcons),
    '@/ui/Button': load('src/ui/Button.tsx', base),
    '@/ui/Hero': load('src/ui/Hero.tsx', base),
    '@/ui/Card': load('src/ui/Card.tsx', base),
    '@/ui/Timeline': load('src/ui/Timeline.tsx', base),
    '@/ui/DateList': load('src/ui/DateList.tsx', withIcons),
    // ボタンの中でサーバー処理を呼ぶ部品は、描画の確認では空にする
    '@/app/trainer/bookings/ApproveButton': { ApproveButton: () => null },
    '@/lib/ticket-summary': ticketSummary,
    '@/lib/trainer-settings': trainerSettings,
  }
}
const from = '2026-09-30T15:00:00.000Z'
const paidAt = '2026-10-01T01:00:00.000Z'
const purchase = (overrides = {}) => ({ id: 'p1', amount: 28000, quantity: 4,
  purchased_at: paidAt, trainee_id: 'trainee', status: 'paid', trainer_id: 'trainer', ...overrides })
const sale = (overrides = {}) => ({ id: 's1', amount: 28000, paid_at: paidAt,
  booking_id: 'b1', payment_method: 'stripe', trainer_id: 'trainer', ...overrides })
const total = rows => rows.reduce((sum, r) => sum + r.amount, 0)

test('ticket-only payment counts its amount and quantity without any booking', () => {
  const rows = revenue.mergeTrainerRevenue([], [purchase()], [], from)
  assert.equal(total(rows), 28000)
  assert.equal(rows[0].quantity, 4)
  assert.equal(rows[0].trainee_id, 'trainee')
  assert.equal(rows[0].booking_id, null)
})
test('legacy combined payment and multiple credit-linked booking sales count only once', () => {
  const rows = revenue.mergeTrainerRevenue([sale(), sale({ id: 's2', booking_id: 'b2', amount: 0 })], [purchase()],
    [{ booking_id: 'b1', purchase_id: 'p1' }, { booking_id: 'b2', purchase_id: 'p1' }], from)
  assert.equal(rows.length, 1)
  assert.equal(total(rows), 28000)
  assert.equal(rows.reduce((sum, r) => sum + r.quantity, 0), 4)
})
test('zero-value ticket redemption rows never add sold sessions after their credit association is released', () => {
  const rows = revenue.mergeTrainerRevenue([sale({ amount: 0, payment_method: null })], [purchase()], [], from)
  assert.equal(rows.length, 1)
  assert.equal(rows.reduce((sum, r) => sum + r.quantity, 0), 4)
})
test('an older purchase is not recognized again when a linked booking sale is recorded this month', () => {
  const rows = revenue.mergeTrainerRevenue([sale()], [purchase({ purchased_at: '2026-09-01T00:00:00Z' })],
    [{ booking_id: 'b1', purchase_id: 'p1' }], from)
  assert.equal(rows.length, 0)
})
test('non-paid purchases and their linked legacy sales are excluded', () => {
  for (const status of ['refunded', 'cancelled', 'pending']) {
    assert.equal(revenue.mergeTrainerRevenue([sale()], [purchase({ status })],
      [{ booking_id: 'b1', purchase_id: 'p1' }], from).length, 0)
  }
})
test('unlinked non-Stripe legacy revenue remains; Stripe sales without any purchases remain', () => {
  assert.equal(total(revenue.mergeTrainerRevenue([sale({ payment_method: 'cash', amount: 5000 })], [purchase()], [], from)), 33000)
  assert.equal(total(revenue.mergeTrainerRevenue([sale()], [], [], from)), 28000)
})
test('lost credit association never guesses whether an old Stripe sale is a second payment', () => {
  assert.throws(() => revenue.mergeTrainerRevenue([sale()], [purchase()], [], from), /集計を停止/)
})
test('JST month boundary counts purchase exactly at start and excludes the preceding millisecond', () => {
  const rows = revenue.mergeTrainerRevenue([], [purchase({ id: 'before', purchased_at: '2026-09-30T14:59:59.999Z' }),
    purchase({ id: 'start', purchased_at: from })], [], from)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, 'purchase:start')
})

function fakeClient(tables, { failure } = {}) {
  const calls = []
  return { calls, auth: { getUser: async () => ({ data: { user: { id: 'trainer-user' } } }) }, from(table) {
    const filters = []
    let sort
    const builder = {
      select(columns) { calls.push({ table, operation: 'select', columns }); return this },
      in(column, values) { filters.push(row => values.includes(row[column])); calls.push({ table, operation: 'in', column, values }); return this },
      eq(column, value) { filters.push(row => row[column] === value); return this },
      gte(column, value) { filters.push(row => row[column] >= value); return this },
      lte(column, value) { filters.push(row => row[column] <= value); return this },
      order(column) { sort = column; return this },
      range(start, end) { calls.push({ table, operation: 'range', start, end }); return Promise.resolve(result(start, end)) },
      maybeSingle() { const r = result(); return Promise.resolve({ ...r, data: r.data?.[0] ?? null }) },
      then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject) },
    }
    function result(start = 0, end = Infinity) {
      if (table === failure) return { data: null, error: { message: 'offline' } }
      let rows = (tables[table] ?? []).filter(row => filters.every(f => f(row)))
      if (sort) rows = rows.toSorted((a, b) => String(a[sort]).localeCompare(String(b[sort])))
      return { data: rows.slice(start, end + 1), error: null, count: rows.length }
    }
    return builder
  } }
}
test('queries scope every revenue source to trainer and paginate beyond 1000 rows', async () => {
  const client = fakeClient({ sales_records: [], session_credit_purchases: [
    ...Array.from({ length: 1001 }, (_, i) => purchase({ id: `p${String(i).padStart(4, '0')}`, amount: 1 })),
    purchase({ id: 'other', trainer_id: 'other-trainer', amount: 999999 }),
  ] })
  const rows = await revenue.loadTrainerRevenue(client, ['trainer'], from)
  assert.equal(rows.length, 1001)
  assert.equal(total(rows), 1001)
  assert.equal(client.calls.filter(c => c.table === 'session_credit_purchases' && c.operation === 'range').length, 3)
  assert.ok(client.calls.some(c => c.table === 'sales_records' && c.column === 'trainer_id'))
  assert.ok(client.calls.some(c => c.table === 'session_credit_purchases' && c.column === 'trainer_id'))
})
test('credit queries are scoped and batched; missing table stops instead of showing incomplete totals', async () => {
  const sales = Array.from({ length: 101 }, (_, i) => sale({ id: `s${i}`, booking_id: `b${i}` }))
  const credits = sales.map(s => ({ id: `c${s.id}`, booking_id: s.booking_id, purchase_id: 'p1', trainer_id: 'trainer' }))
  const client = fakeClient({ sales_records: sales, session_credit_purchases: [purchase()], session_credits: credits })
  assert.equal(total(await revenue.loadTrainerRevenue(client, ['trainer'], from)), 28000)
  assert.equal(client.calls.filter(c => c.table === 'session_credits' && c.column === 'booking_id').length, 2)
  assert.equal(client.calls.filter(c => c.table === 'session_credits' && c.column === 'trainer_id').length, 2)
  for (const failure of ['sales_records', 'session_credit_purchases', 'session_credits']) {
    await assert.rejects(() => revenue.loadTrainerRevenue(fakeClient({ sales_records: [sale()] }, { failure }), ['trainer'], from), /取得できません/)
  }
})
test('future unmatched Stripe sale is outside the report interval and cannot stop this month', async () => {
  const through = '2026-10-31T14:59:59.999Z'
  const futureSale = sale({ paid_at: '2026-10-31T15:00:00.000Z' })
  assert.equal(total(revenue.mergeTrainerRevenue([futureSale], [purchase()], [], from, through)), 28000)
  assert.equal(total(await revenue.loadTrainerRevenue(fakeClient({ sales_records: [futureSale],
    session_credit_purchases: [purchase()] }), ['trainer'], from, through)), 28000)
})
test('empty trainer scope performs no queries', async () => {
  const client = fakeClient({})
  assert.equal((await revenue.loadTrainerRevenue(client, [], from)).length, 0)
  assert.equal(client.calls.length, 0)
})

test('actual sales and dashboard page functions agree on current month and use purchase names and quantities', async () => {
  const datetime = load('src/lib/datetime.ts')
  const today = datetime.formatJstDateKey()
  const { start, end } = datetime.jstMonthBounds(today)
  const previous = datetime.jstMonthBounds(datetime.addMonthsToDateKey(today, -1)).start
  const future = new Date(end.getTime() + 1)
  const client = fakeClient({
    trainer_profiles: [{ id: 'trainer', user_id: 'trainer-user' }], users: [{ id: 'trainer-user', name: 'Synthetic Trainer' }],
    session_credit_purchases: [purchase({ purchased_at: start.toISOString() }),
      purchase({ id: 'previous', purchased_at: previous.toISOString(), amount: 7000, quantity: 1 }),
      purchase({ id: 'future', purchased_at: future.toISOString(), amount: 9999, quantity: 1 })],
    sales_records: [sale({ paid_at: start.toISOString() }), sale({ id: 'cash', booking_id: 'b2', payment_method: 'cash', amount: 5000, paid_at: start.toISOString() }),
      sale({ id: 'future-ambiguous', booking_id: 'future-booking', paid_at: future.toISOString() })],
    session_credits: [{ id: 'c1', booking_id: 'b1', purchase_id: 'p1', trainer_id: 'trainer' }],
    bookings: [{ id: 'b2', trainee_id: 'cash-trainee', trainer_id: 'trainer', scheduled_at: start.toISOString(), status: 'completed' }],
  })
  const dependencies = {
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    '@/lib/supabase-server': { createServerSupabaseClient: async () => client },
    '@/lib/trainer-revenue': revenue,
    '@/lib/datetime': datetime,
    '@/lib/trainee-display': { loadTraineeNameMap: async (_client, ids) => Object.fromEntries(ids.map(id => [id, `Synthetic ${id}`])) },
    '@/lib/dev-preview': { isDevAuthBypassEnabled: () => false },
    'next/navigation': { redirect: () => { throw Error('unexpected redirect') } },
    '@/components/charts/SalesBarChart': {},
    'next/link': {}, '@/app/auth/login/actions': {},
  }
  Object.assign(dependencies, uiDependencies(dependencies['react/jsx-runtime'], {}))
  dependencies['./TrainerHomeMobile'] = { TrainerHomeMobile: () => null }
  const salesPage = await load('src/app/trainer/sales/page.tsx', dependencies).default()
  const dashboard = await load('src/app/trainer/dashboard/page.tsx', dependencies).default()
  assert.equal(salesPage.props.currentTotal, 33000)
  assert.equal(dashboard.props.totalSales, 33000)
  assert.equal(salesPage.props.prevTotal, 7000)
  assert.equal(salesPage.props.currentSoldSessions, 5)
  assert.equal(salesPage.props.records.find(r => r.id === 'purchase:p1').name, 'Synthetic trainee')
  assert.equal(salesPage.props.monthlySalesData.reduce((sum, r) => sum + r.amount, 0), 40000)
})

test('ambiguous revenue hides only dashboard sales and gives explicit sales-page status without false zero', async () => {
  const jsxRuntime = await import('react/jsx-runtime')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const datetime = load('src/lib/datetime.ts')
  const today = datetime.formatJstDateKey()
  const currentDate = datetime.jstMonthBounds(today).start.toISOString()
  const client = fakeClient({
    trainer_profiles: [{ id: 'trainer', user_id: 'trainer-user' }],
    users: [{ id: 'trainer-user', name: 'Synthetic Trainer' }],
    sales_records: [sale({ paid_at: currentDate })],
    session_credit_purchases: [purchase({ purchased_at: currentDate })],
    bookings: [{ id: 'b1', trainer_id: 'trainer', trainee_id: 'trainee',
      scheduled_at: new Date().toISOString(), status: 'pending' }],
    trainer_trainee: [{ trainer_id: 'trainer', status: 'active' }],
  })
  const dependencies = {
    'react/jsx-runtime': jsxRuntime,
    '@/lib/supabase-server': { createServerSupabaseClient: async () => client },
    '@/lib/trainer-revenue': revenue, '@/lib/datetime': datetime,
    '@/lib/trainee-display': { loadTraineeNameMap: async () => ({ trainee: 'Synthetic Customer' }) },
    '@/lib/dev-preview': { isDevAuthBypassEnabled: () => false },
    'next/navigation': { redirect: () => { throw Error('unexpected redirect') } },
    '@/components/charts/SalesBarChart': {},
    'next/link': { default: props => jsxRuntime.jsx('a', props) }, '@/app/auth/login/actions': {},
  }
  Object.assign(dependencies, uiDependencies(jsxRuntime, dependencies['next/link']))
  // スマホのホーム画面も本物を描画し、売上エラーやお客様名が出ることまで確認する
  dependencies['./TrainerHomeMobile'] = load('src/app/trainer/dashboard/TrainerHomeMobile.tsx', {
    ...uiDependencies(jsxRuntime, dependencies['next/link']),
    'react/jsx-runtime': jsxRuntime, 'next/link': dependencies['next/link'], '@/lib/datetime': datetime,
  })
  const dashboard = await load('src/app/trainer/dashboard/page.tsx', dependencies).default()
  assert.equal(dashboard.props.totalSales, null)
  assert.equal(dashboard.props.clientCount, 1)
  assert.equal(dashboard.props.pendingCount, 1)
  assert.equal(dashboard.props.todayBookings.length, 1)
  const dashboardMarkup = renderToStaticMarkup(dashboard)
  assert.match(dashboardMarkup, /購入と予約売上の対応を確認できないため/)
  assert.match(dashboardMarkup, /Synthetic Customer/)
  assert.doesNotMatch(dashboardMarkup, /¥0/)
  const salesMarkup = renderToStaticMarkup(await load('src/app/trainer/sales/page.tsx', dependencies).default())
  assert.match(salesMarkup, /role="status"/)
  assert.match(salesMarkup, /売上集計を表示できません/)
  assert.doesNotMatch(salesMarkup, /¥0|0件/)
  assert.match(revenue.trainerRevenueErrorMessage(Error('private detail')), /再読み込み/)
  assert.doesNotMatch(revenue.trainerRevenueErrorMessage(Error('private detail')), /private detail/)
})
