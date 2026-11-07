// Local integration harness. Executes application modules against real PostgREST/PG.
// Does NOT implement Supabase Auth/LINE or use the remote DB. Test Stripe only.
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { parseEnv } from 'node:util'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { AsyncLocalStorage } from 'node:async_hooks'
import crypto from 'node:crypto'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { createClient } from '@supabase/supabase-js'
const root=resolve(import.meta.dirname,'../..')
const runtime=resolve(process.argv[2] ?? '/tmp/fitall-concurrency-db/node_modules')
const bins=resolve(process.argv[3] ?? '/tmp/fitall-local-bin')
const runtimeRequire=createRequire(join(runtime,'local.cjs'))
const {default:EmbeddedPostgres}=await import(pathToFileURL(runtimeRequire.resolve('embedded-postgres')))
const key=parseEnv(readFileSync(join(root,'.env.local'),'utf8')).STRIPE_SECRET_KEY
assert.ok(key?.startsWith('sk_test_'),'Only a Stripe test key is allowed')
const runDir=mkdtempSync(join(tmpdir(),'fitall-e2e-'))
const secret=crypto.randomBytes(32).toString('hex')
const password=crypto.randomBytes(20).toString('hex')
const tokenPayload=Buffer.from(JSON.stringify({role:'service_role',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')
const tokenHeader=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')
const tokenBody=`${tokenHeader}.${tokenPayload}`
const jwt=`${tokenBody}.${crypto.createHmac('sha256',secret).update(tokenBody).digest('base64url')}`
const origin='http://127.0.0.1:3117'
// Explicit env allowlist for loaded modules; no remote DB, LINE or email credentials.
const appEnv={NODE_ENV:'test',STRIPE_SECRET_KEY:key,NEXT_PUBLIC_APP_URL:origin,
 NEXT_PUBLIC_SUPABASE_URL:origin,SUPABASE_SERVICE_ROLE_KEY:jwt}
const pg=new EmbeddedPostgres({databaseDir:join(runDir,'pg'),port:55441,user:'postgres',password,
 persistent:true,autoRehydrateSymlinks:true,postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog(){},onError(){}})
const children=[];let db,server,sid,checkoutUrl,lastPayload,lastSignature,checking=false,done=false
let setupDone=false, fatalError, stopping
function dependencyFailed() {
 fatalError=new Error('Local dependency failed')
 if(setupDone){status.stage='dependency-failed';void stop().finally(()=>process.exit(1))}
}
async function managedSpawn(command,args,options){
 const child=spawn(command,args,options);children.push(child)
 child.on('error',dependencyFailed)
 child.on('exit',()=>{if(!stopping)dependencyFailed()})
 await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject)})
 return child
}
const status={stage:'starting',notificationsSuppressed:0,checks:[]}
const trainerId=crypto.randomUUID(),trainerUserId=crypto.randomUUID(),planId=crypto.randomUUID()
const email=`fitall-${crypto.randomUUID()}@example.invalid`
const context=new AsyncLocalStorage()
const client=createClient(origin,jwt,{auth:{persistSession:false,autoRefreshToken:false}})
const cache=new Map()
const mocks={
 'next/headers':{headers:async()=>context.getStore()??new Headers()},
 'next/server':{NextResponse:{json:(v,o)=>Response.json(v,o)}},
 'next/cache':{revalidatePath(){}},
 '@/lib/customer-app':{loadCustomerAppMutationContext:async()=>{
  const u=await client.from('users').select('*').eq('email',email).single()
  const p=await client.from('trainee_profiles').select('*').eq('user_id',u.data.id).single()
  return {supabase:client,customerUser:u.data,traineeProfile:p.data,trainerProfile:{id:trainerId,user_id:trainerUserId,bio:null},trainerUser:{name:'Local trainer'}}
 }},
 '@/lib/booking-notifications':new Proxy({}, {get:()=>async()=>{status.notificationsSuppressed++;return {sent:0}}}),
}
function load(file){
 const full=resolve(root,file);if(cache.has(full))return cache.get(full)
 const exports={};cache.set(full,exports)
 const require=(name)=>{
  if(name in mocks)return mocks[name]
  if(name==='crypto')return crypto
  if(name==='@supabase/supabase-js')return {createClient}
  if(name.startsWith('@/'))return load(`src/${name.slice(2)}.ts`)
  if(name.startsWith('.'))return load(resolve(dirname(full),`${name}.ts`))
  throw Error(`Unapproved dependency ${name}`)
 }
 vm.runInNewContext(ts.transpileModule(readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
 {exports,require,process:{env:appEnv},fetch,Headers,Response,Request,URL,URLSearchParams,Buffer,Date,Intl,Map,Set,console:{error(){status.stage='application-error'}}},{filename:file})
 return exports
}
async function verify(){
 if(checking||done)return;checking=true
 try {
  const counts=await db.query('select (select count(*)::int from session_credit_purchases) purchases,(select count(*)::int from session_credits) credits,(select count(*)::int from bookings) bookings')
  assert.deepEqual(counts.rows[0],{purchases:1,credits:4,bookings:0});status.checks.push('paid-webhook: 1 purchase / 4 tickets / 0 bookings')
  // Real signature and payload redelivery through the real webhook handler.
  const handler=load('src/app/api/stripe/webhook/route.ts')
  const deliveries=await Promise.all(Array.from({length:4},()=>context.run(new Headers({'stripe-signature':lastSignature}),()=>handler.POST(new Request(origin+'/api/stripe/webhook',{method:'POST',body:lastPayload})))))
  assert.ok(deliveries.every(r=>r.status===200))
  assert.equal((await db.query('select count(*)::int n from session_credits')).rows[0].n,4)
  status.checks.push('4 redeliveries: still 4 tickets')
  const publicData=await load('src/lib/public-booking.ts').getPublicBookingData(trainerId)
  assert.ok(publicData.slots.length)
  const form=new FormData();form.set('scheduled_at',publicData.slots[0].value)
  const action=load('src/app/customer/app/bookings/actions.ts')
  const booking=await action.createCustomerBookingAction(null,form);assert.equal(booking.status,'success')
  const again=await action.createCustomerBookingAction(null,form);assert.equal(again.status,'error')
  const balances=await db.query("select count(*) filter(where status='available')::int available,count(*) filter(where status='scheduled')::int scheduled from session_credits")
  assert.deepEqual(balances.rows[0],{available:3,scheduled:1})
  status.checks.push('booking: 3 remaining / 1 scheduled; same-slot retry rejected')
  const revenue=await load('src/lib/trainer-revenue.ts').loadTrainerRevenue(client,[trainerId],'2020-01-01T00:00:00Z')
  assert.equal(revenue.length,1);assert.equal(revenue[0].amount,1000);assert.equal(revenue[0].quantity,4)
  status.checks.push('revenue: JPY 1000 once, quantity 4; no second charge for booking')
  status.stage='passed';done=true
  writeFileSync(join(runDir,'result.json'),JSON.stringify(status,null,2),{mode:0o600})
  console.log(JSON.stringify({result:status,runDir}))
 }catch(e){status.stage='verification-failed';console.log(JSON.stringify({failure:e.message}));}finally{checking=false}
}
async function stop(){
 if(stopping)return stopping
 stopping=(async()=>{
  for(const child of children)if(child.exitCode===null)child.kill('SIGTERM')
  if(server)await new Promise(r=>{server.close(()=>r());server.closeAllConnections()})
  if(db)await db.end().catch(()=>{})
  await pg.stop().catch(()=>{})
 })()
 return stopping
}
process.on('SIGTERM',()=>stop().finally(()=>process.exit()))
process.on('SIGINT',()=>stop().finally(()=>process.exit()))
try{
 await pg.initialise();await pg.start();db=pg.getPgClient();await db.connect()
 await db.query(readFileSync(join(root,'scripts/local-verification/schema.sql'),'utf8'))
 for(const file of ['20260630_create_session_credits.sql','20260702_production_booking_hardening.sql','20261103110747_atomic_tickets_and_booking_ranges.sql'])await db.query(readFileSync(join(root,'supabase/migrations',file),'utf8'))
 await db.query('grant usage on schema public to service_role; grant all on all tables in schema public to service_role')
 await db.query("insert into users(id,name,email,role) values($1,'Local trainer','trainer@example.invalid','trainer')",[trainerUserId])
 await db.query('insert into trainer_profiles(id,user_id) values($1,$2)',[trainerId,trainerUserId])
 await db.query("insert into plans(id,trainer_id,name,price,sessions) values($1,$2,'Local 4 tickets',1000,4)",[planId,trainerId])
 await db.query("insert into trainer_availability(trainer_id,slot_date,start_time,end_time) select $1,((now() at time zone 'Asia/Tokyo')::date+i),'09:00','21:00' from generate_series(1,7) i",[trainerId])
 const cfg=join(runDir,'postgrest.conf');writeFileSync(cfg,`db-uri = "postgres://postgres:${password}@127.0.0.1:55441/postgres"\ndb-schemas = "public"\ndb-anon-role = "anon"\njwt-secret = "${secret}"\nserver-host = "127.0.0.1"\nserver-port = 55442\n`,{mode:0o600})
 const rest=await managedSpawn(join(bins,'postgrest'),[cfg],{env:{PATH:process.env.PATH,DYLD_LIBRARY_PATH:join(runtime,'@embedded-postgres/darwin-arm64/native/lib')},stdio:['ignore','pipe','pipe']})
 rest.stderr.on('data',()=>{});rest.stdout.on('data',()=>{})
 for(let i=0;i<40;i++){if(fatalError)throw fatalError;try{if((await fetch('http://127.0.0.1:55442/')).ok)break}catch{};await new Promise(r=>setTimeout(r,250))}
 server=createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,origin)
   if(url.pathname.startsWith('/rest/v1/')){
    const chunks=[];for await(const chunk of req)chunks.push(chunk)
    const h={...req.headers};delete h.host;delete h['content-length']
    const response=await fetch('http://127.0.0.1:55442'+url.pathname.slice('/rest/v1'.length)+url.search,{method:req.method,headers:h,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)})
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return
   }
   if(url.pathname==='/api/stripe/webhook'&&req.method==='POST'){
    const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks).toString();const event=JSON.parse(body)
    if(event.livemode!==false||event.type!=='checkout.session.completed'||event.data?.object?.id!==sid){res.writeHead(200);res.end('ignored');return}
    const sig=req.headers['stripe-signature'];const response=await context.run(new Headers({'stripe-signature':sig??''}),()=>load('src/app/api/stripe/webhook/route.ts').POST(new Request(origin+url.pathname,{method:'POST',body})))
    res.writeHead(response.status);res.end(await response.text())
    if(response.ok){lastPayload=body;lastSignature=sig;void verify()}return
   }
   if(url.pathname==='/status'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(status));return}
   res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<h1>FITALL local integration test</h1><p>Test mode only. Synthetic data. No LINE/email notifications.</p><p>Status: ${status.stage}</p>${checkoutUrl?`<a href="${checkoutUrl}">Open Stripe test Checkout</a>`:''}<p><a href="/status">Verification results</a></p>`)
  }catch{res.writeHead(500);res.end('Local verification error')}
 });server.on('error',dependencyFailed)
 await new Promise((r,reject)=>{server.once('error',reject);server.listen(3117,'127.0.0.1',r)})
 const listener=await managedSpawn(join(bins,'stripe'),['listen','--events','checkout.session.completed','--forward-to',origin+'/api/stripe/webhook','--skip-update'],{env:{PATH:process.env.PATH,STRIPE_API_KEY:key},stdio:['ignore','pipe','pipe']})
 let logs='';function observe(chunk){logs=(logs+chunk.toString()).slice(-12000);const match=logs.match(/whsec_[A-Za-z0-9]+/);if(match)appEnv.STRIPE_WEBHOOK_SECRET=match[0]}
 listener.stdout.on('data',observe);listener.stderr.on('data',observe)
 for(let i=0;i<80&&!appEnv.STRIPE_WEBHOOK_SECRET;i++){if(fatalError)throw fatalError;await new Promise(r=>setTimeout(r,250))}
 assert.ok(appEnv.STRIPE_WEBHOOK_SECRET,'Stripe listener did not become ready')
 const stripe=load('src/lib/stripe.ts');const original=stripe.createStripeCheckoutSession
 stripe.createStripeCheckoutSession=async input=>{const session=await original(input);sid=session.id;return session}
 const form=new FormData();for(const [k,v]of Object.entries({trainer_id:trainerId,plan_id:planId,customer_name:'Local test customer',customer_email:email}))form.set(k,v)
 const result=await load('src/app/book/[trainerId]/actions.ts').createPublicBookingCheckoutAction(null,form)
 assert.ok(result.checkoutUrl,result.error);checkoutUrl=result.checkoutUrl;assert.ok(sid.startsWith('cs_test_'))
 if(fatalError)throw fatalError
 setupDone=true
 status.stage='awaiting-test-payment';console.log(JSON.stringify({url:origin,runDir,stage:status.stage}))
}catch(e){console.log(JSON.stringify({setupFailure:e.message}));await stop();process.exitCode=1}
