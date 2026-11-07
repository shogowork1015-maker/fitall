// Real Next.js UI + signed customer session + isolated PostgREST/PG.
// No .env files, production data, external auth or notification credentials are read.
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { mkdtemp, readFile, writeFile, cp, symlink, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import crypto from 'node:crypto'
const root=resolve(import.meta.dirname,'../..'), runtime='/tmp/fitall-concurrency-db/node_modules', bins=process.env.FITALL_LOCAL_TEST_BIN_DIR || '/tmp/fitall-local-bin'
const req=createRequire(join(runtime,'ui.cjs'))
const {default:EmbeddedPostgres}=await import(pathToFileURL(req.resolve('embedded-postgres')))
const dir=await mkdtemp(join(tmpdir(),'fitall-customer-ui-')), app=join(dir,'app')
const secret=crypto.randomBytes(32).toString('hex'), password=crypto.randomBytes(24).toString('hex')
const origin='http://127.0.0.1:3118', api='http://127.0.0.1:55445'
function jwt(role){const body=[{alg:'HS256',typ:'JWT'},{role,exp:Math.floor(Date.now()/1000)+7200}].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');return body+'.'+crypto.createHmac('sha256',secret).update(body).digest('base64url')}
const pg=new EmbeddedPostgres({databaseDir:join(dir,'pg'),port:55443,user:'postgres',password,persistent:true,autoRehydrateSymlinks:true,postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog(){},onError(){}})
let db,server,stopping,fatalError,ready=false;const children=[]
function check(){if(fatalError)throw fatalError;if(stopping)throw Error('Local cleanup already started')}
function dependencyFailed(){fatalError=new Error('Local dependency exited');if(ready)void stop().finally(()=>process.exit(1))}
async function stop(){if(stopping)return stopping;stopping=(async()=>{for(const p of children)if(p.exitCode===null)p.kill('SIGTERM');if(server)await new Promise(r=>{server.close(r);server.closeAllConnections()});if(db)await db.end().catch(()=>{});await pg.stop().catch(()=>{})})();return stopping}
async function start(cmd,args,options){check();const p=spawn(cmd,args,options);children.push(p);p.on('error',dependencyFailed);p.on('exit',()=>{if(!stopping)dependencyFailed()});await new Promise((r,j)=>{p.once('spawn',r);p.once('error',j)});return p}
process.on('SIGTERM',()=>stop().finally(()=>process.exit()));process.on('SIGINT',()=>stop().finally(()=>process.exit()))
const ids=Object.fromEntries(['trainerUser','trainer','customer','trainee','purchase','plan'].map(k=>[k,crypto.randomUUID()]))
const invite='local-'+crypto.randomBytes(20).toString('hex')
try{
 await mkdir(app)
 for(const name of ['src','public','package.json','package-lock.json','tsconfig.json','next.config.ts','next-env.d.ts','postcss.config.mjs']){
  try{await cp(join(root,name),join(app,name),{recursive:true})}catch(e){if(e.code!=='ENOENT')throw e}
 }
 await symlink(join(root,'node_modules'),join(app,'node_modules'))
 await pg.initialise();await pg.start();db=pg.getPgClient();await db.connect()
 await db.query(await readFile(join(root,'scripts/local-verification/schema.sql'),'utf8'))
 await db.query('alter table trainee_profiles add column goal text, add column height numeric, add column weight numeric;')
 for(const f of ['20260630_create_session_credits.sql','20260702_production_booking_hardening.sql','20261103110747_atomic_tickets_and_booking_ranges.sql','20261104010941_customer_booking_changes.sql'])await db.query(await readFile(join(root,'supabase/migrations',f),'utf8'))
 await db.query('grant usage on schema public to service_role;grant all on all tables in schema public to service_role')
 await db.query(`do $$ declare t record; begin for t in select tablename from pg_tables where schemaname='public' loop execute format('alter table public.%I enable row level security',t.tablename);end loop;end $$`)
 await db.query("insert into users(id,name,email,role) values($1,'Local trainer','trainer@example.invalid','trainer'),($2,'Local customer','customer@example.invalid','trainee')",[ids.trainerUser,ids.customer])
 await db.query('insert into trainer_profiles(id,user_id) values($1,$2)',[ids.trainer,ids.trainerUser])
 await db.query('insert into trainee_profiles(id,user_id) values($1,$2)',[ids.trainee,ids.customer])
 await db.query("insert into trainer_trainee(trainer_id,trainee_id,status,invite_token) values($1,$2,'active',$3)",[ids.trainer,ids.trainee,invite])
 await db.query("insert into plans(id,trainer_id,name,price,sessions) values($1,$2,'検証用4回チケット',1000,4)",[ids.plan,ids.trainer])
 await db.query("insert into session_credit_purchases(id,trainer_id,trainee_id,plan_id,quantity,status,amount) values($1,$2,$3,$4,4,'paid',1000)",[ids.purchase,ids.trainer,ids.trainee,ids.plan])
 await db.query('select * from fitall_ensure_purchase_credits($1,$2,$3,4)',[ids.purchase,ids.trainer,ids.trainee])
 const booked=(await db.query("select fitall_book_customer_ticket($1,$2,((now() at time zone 'Asia/Tokyo')::date+7+time '14:00') at time zone 'Asia/Tokyo') id",[ids.trainer,ids.trainee])).rows[0].id
 await db.query("insert into trainer_availability(trainer_id,slot_date,start_time,end_time) select $1,((now() at time zone 'Asia/Tokyo')::date+i),'09:00','21:00' from generate_series(2,14) i",[ids.trainer])
 const initial=(await db.query('select id,scheduled_at,status from bookings where id=$1',[booked])).rows[0]
 const cfg=join(dir,'postgrest.conf');await writeFile(cfg,`db-uri = "postgres://postgres:${password}@127.0.0.1:55443/postgres"\ndb-schemas = "public"\ndb-anon-role = "anon"\njwt-secret = "${secret}"\nserver-host = "127.0.0.1"\nserver-port = 55444\n`,{mode:0o600})
 await start(join(bins,'postgrest'),[cfg],{env:{PATH:process.env.PATH,DYLD_LIBRARY_PATH:join(runtime,'@embedded-postgres/darwin-arm64/native/lib')},stdio:'ignore'})
 let restReady=false
 for(let i=0;i<40;i++){check();try{const r=await fetch('http://127.0.0.1:55444/');if(r.status<500){restReady=true;break}}catch{}await new Promise(r=>setTimeout(r,250))}
 check();if(!restReady)throw Error('Local API readiness timeout')
 server=createServer(async(request,response)=>{try{
  const u=new URL(request.url,api)
  if(u.pathname==='/status'){
   const b=(await db.query('select id,scheduled_at,status from bookings where id=$1',[booked])).rows[0]
   const tickets=(await db.query("select count(*)::int total,count(*) filter(where status='available')::int available,count(*) filter(where status='scheduled')::int scheduled from session_credits")).rows[0]
   const result={boundary:'local signed-session UI, no LINE OAuth, synthetic DB',initial,booking:b,tickets}
   await writeFile(join(dir,'result.json'),JSON.stringify(result,null,2),{mode:0o600})
   response.setHeader('Content-Type','application/json');response.end(JSON.stringify(result));return
  }
  if(!u.pathname.startsWith('/rest/v1/')){response.writeHead(404);response.end();return}
  const chunks=[];for await(const chunk of request)chunks.push(chunk)
  const h={...request.headers};delete h.host;delete h['content-length']
  const r=await fetch('http://127.0.0.1:55444'+u.pathname.slice(8)+u.search,{method:request.method,headers:h,body:['GET','HEAD'].includes(request.method)?undefined:Buffer.concat(chunks)})
  response.writeHead(r.status,Object.fromEntries(r.headers));response.end(Buffer.from(await r.arrayBuffer()))
 }catch{response.writeHead(500);response.end('Local test error')}})
 check();server.on('error',dependencyFailed)
 await new Promise((r,j)=>{server.once('error',j);server.listen(55445,'127.0.0.1',r)})
 // Prevent accidental outbound fetches even if application code attempts notification/auth.
 const guard=join(dir,'loopback-only.cjs')
 await writeFile(guard,`const original=globalThis.fetch;globalThis.fetch=(input,options)=>{const u=new URL(typeof input==='string'||input instanceof URL?input:input.url);if(!['127.0.0.1','localhost','[::1]'].includes(u.hostname))throw Error('External fetch disabled in local verification');return original(input,options)};`)
 const log=await import('node:fs').then(m=>m.openSync(join(dir,'next.log'),'a',0o600))
 await start(process.execPath,[join(root,'node_modules/next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port','3118'],{cwd:app,env:{PATH:process.env.PATH,HOME:process.env.HOME,NODE_OPTIONS:`--require=${guard}`,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:api,NEXT_PUBLIC_SUPABASE_ANON_KEY:jwt('anon'),SUPABASE_SERVICE_ROLE_KEY:jwt('service_role'),CUSTOMER_APP_SESSION_SECRET:crypto.randomBytes(32).toString('hex'),NEXT_PUBLIC_APP_URL:origin,FITALL_REQUIRE_SUPABASE_ENV:'1',FITALL_DEV_AUTH_BYPASS:'0',FITALL_CUSTOMER_PREVIEW:'0',FITALL_BOOKING_PREVIEW:'0'},stdio:['ignore',log,log]})
 let appReady=false
 for(let i=0;i<120;i++){check();try{const r=await fetch(origin+'/customer/app/bookings/list');if(r.ok){appReady=true;break}}catch{}await new Promise(r=>setTimeout(r,250))}
 check();if(!appReady)throw Error('Local app readiness timeout');ready=true
 console.log(JSON.stringify({dir,entry:origin+'/customer/onboarding/'+invite,status:api+'/status',fixture:{tickets:4,available:3,scheduled:1}}))
}catch(e){console.error(e.message);await stop();process.exitCode=1}
