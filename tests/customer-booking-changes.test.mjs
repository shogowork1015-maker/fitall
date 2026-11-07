import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const id = '10000000-0000-0000-0000-000000000001'
const expectedAt = '2038-01-01T10:00:00Z', newAt = '2038-01-02T10:00:00Z'
function setup(opts = {}) {
  const calls = [], filters = [], paths = []
  const query = { select(){return query},eq(k,v){filters.push([k,v]);return query},async maybeSingle(){return {data:opts.missing ? null : {id,scheduled_at:expectedAt,status:'confirmed'}}} }
  const context = { trainerProfile:{id:'trusted-trainer'},traineeProfile:{id:'trusted-trainee'},supabase:{from(){return query},async rpc(name,args){calls.push({name,args});return {data:opts.data ?? 'returned',error:opts.error}}} }
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/customer/app/bookings/manage-actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Date,require(name){
    if(name==='next/cache')return {revalidatePath:p=>paths.push(p)}
    if(name==='@/lib/customer-app')return {loadCustomerAppMutationContext:async()=>opts.noSession ? null : context}
    if(name==='@/lib/public-booking')return {getPublicBookingData:async()=>({slots:opts.slots ?? [{value:newAt}]})}
    throw Error('Unexpected dependency '+name)
  }})
  return {actions:exports,calls,filters,paths}
}
test('customer changes require session and valid input before RPC',async()=>{
  for(const opts of [{noSession:true},{}]){
    const s=setup(opts)
    const result=await s.actions.changeCustomerBooking({bookingId:opts.noSession?id:'bad',expectedAt})
    assert.equal(result.status,'error');assert.equal(s.calls.length,0)
  }
})
test('cancel uses trusted identities and one atomic RPC; refreshes balances',async()=>{
  const s=setup();assert.equal((await s.actions.changeCustomerBooking({bookingId:id,expectedAt,trainer_id:'attacker'})).status,'success')
  assert.equal(s.calls.length,1);assert.equal(s.calls[0].args.p_trainer_id,'trusted-trainer');assert.equal(s.calls[0].args.p_trainee_id,'trusted-trainee');assert.equal(s.calls[0].args.p_new_at,null)
  assert.ok(s.paths.includes('/customer/app/tickets'))
})
test('reschedule rejects unavailable slots and inaccessible bookings before RPC',async()=>{
  for(const opts of [{slots:[]},{missing:true}]){
    const s=setup(opts);assert.equal((await s.actions.changeCustomerBooking({bookingId:id,expectedAt,newAt})).status,'error');assert.equal(s.calls.length,0)
    assert.ok(s.filters.some(([k,v])=>k==='trainee_id'&&v==='trusted-trainee'))
  }
})
test('reschedule sends normalized dates to atomic RPC',async()=>{
  const s=setup({data:'rescheduled'});assert.equal((await s.actions.changeCustomerBooking({bookingId:id,expectedAt,newAt})).status,'success');assert.equal(s.calls[0].args.p_new_at,new Date(newAt).toISOString())
})
for(const code of ['P0003','P0004','P0005','23P01','42883'])test('RPC failure '+code+' never claims success',async()=>{
  const s=setup({error:{code}});assert.equal((await s.actions.changeCustomerBooking({bookingId:id,expectedAt})).status,'error');assert.equal(s.paths.length,0)
})
test('expired return is clearly not spendable or refunded',async()=>{
  const s=setup({data:'returned_expired'});assert.match((await s.actions.changeCustomerBooking({bookingId:id,expectedAt})).message,/再利用できません/)
})
