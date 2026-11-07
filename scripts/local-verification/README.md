# Local Stripe integration verification

This is a **server-processing integration harness**, not the complete Next.js app or a clone of the production Supabase project. No remote DB URL or service key is used. No cloud project is created.

It loads the application's actual public checkout action, Stripe helper, webhook handler (including signature verification), ticket RPCs, booking action, availability queries, and revenue loader. Data travels through supabase-js → local PostgREST → isolated PostgreSQL. Stripe CLI forwards test checkout events. Only the exact Checkout session created by this run is processed; live/unrelated events are ignored.

Substituted boundaries: a synthetic customer context instead of LINE/Supabase Auth; Next headers/cache/response adapters; notification no-ops. The minimal fixture schema is not a full schema/RLS/trigger backup. In particular `20260706_security_booking_hardening.sql` is not applied by this fixture. Do not report a pass as UI, authentication, notification, production RLS, or deployed-app acceptance.

## Requirements

- Node 24 and repository dependencies.
- `embedded-postgres` and `pg` installed outside the app (currently `/tmp/fitall-concurrency-db/node_modules`, embedded-postgres18.6.0-beta.19).
- Official PostgREST16.5 macOS arm64 and Stripe CLI1.55.6 binaries in `/tmp/fitall-local-bin`. PostgREST uses embedded-postgres's libpq via process-local DYLD_LIBRARY_PATH.
- `.env.local` with a Stripe `sk_test_` key. The script reads **only that value**; the test subprocess environment does not load the remote Supabase/LINE/email keys. Never print or commit credentials.

```sh
node scripts/local-verification/run.mjs /tmp/fitall-concurrency-db/node_modules /tmp/fitall-local-bin
```

Each launch creates a new temporary database with synthetic data. Ports: `127.0.0.1:3117` (test harness and REST proxy), `55441` (PG), `55442` (PostgREST). Visit <http://127.0.0.1:3117> for the test Checkout link. Use only an approved Stripe test-card flow; no real card or saved payment method.

After a successful test payment, the harness verifies:

1. One paid purchase / four issued tickets / zero bookings.
2. Four replayed signed payloads still leave four tickets.
3. One real booking action leaves three available and one scheduled ticket; the same-slot retry fails.
4. Revenue loader reports JPY1000 once, quantity4, without another charge for the reservation.

Results: `/status` on the loopback server and `result.json` in the printed temporary run directory. That directory also contains a local-only DB config/password and data; do not publish it. Stop with Ctrl-C (or SIGTERM) to stop the listener/API/DB. A pending Checkout may remain in Stripe test mode until expiry; closing the local process does not cancel a Stripe session. A rerun is a distinct synthetic test purchase.

Current limitation: this harness is for a trusted developer workstation, not deployment. A result requires `stage=passed`; `awaiting-test-payment` only proves setup and Checkout creation.

Startup failures (missing binary or occupied HTTP port) now flow through cleanup. Unexpected child process exit after startup also marks failure and stops the local stack. These checks do not change the production app.

Observed run 2026-11-04: Stripe sandbox Checkout `complete/paid`, `livemode=false`, JPY1000/4 tickets; signed CLI webhook → local DB → four payload replays → reservation → revenue all passed. These application checks ran before the lifecycle-only cleanup revision; missing-binary/occupied-port cleanup was exercised separately on the revised launcher. No application business logic changed between these checks. The test service was then stopped.

## Customer session and booking UI verification

`node scripts/local-verification/customer-ui.mjs` runs the actual Next.js app from a temporary source copy, with real server actions, signed customer cookies, PostgREST and PostgreSQL. It never reads/copies `.env*`; preview and authentication bypass are disabled. It seeds only synthetic customers, an invitation, one booking and four tickets (three available). The purchase fixture is seeded as paid, not another Stripe payment.

Ports: loopback3118 (Next),55443(PG),55444(PostgREST),55445(API proxy and read-only `/status`). Open the entry URL printed by the launcher. Submit the existing customer onboarding form; the application's own action creates its signed cookie. LINE is intentionally unconfigured, so the existing handler redirects to the account page with `setup-required`. Navigate using the Reservation tab, move the booking, reload, cancel it, and view tickets. `/status` records the original/current booking and ticket counts to `result.json` in the temporary directory.

**This proves the registration-link signed-session path, not LINE OAuth or Supabase Auth login.** No fake cookie is injected, no customer-context function is substituted, and no Next adapter is used. The fixture remains a minimal schema rather than a production backup; RLS is enabled with no anon/authenticated table grants and service-role access. It is not a full production-policy test. External server fetches are denied by a process preload; external credentials are absent. Do not click external LINE links or purchase during this workflow.

Observed 2026-11-04: anonymous booking list inaccessible → actual onboarding form → signed session → reservation displayed → UI move persisted after reload (same booking ID,3 available/1 scheduled) → UI cancel persisted (4 available/0 scheduled,total4) → ticket screen4. Evidence `/tmp/fitall-ui-after-move.json`, `/tmp/fitall-ui-after-cancel.json`, `/tmp/fitall-ui-moved.png`, `/tmp/fitall-ui-cancelled.png`, `/tmp/fitall-ui-returned-tickets.png`. App business code was unchanged in this run. Services stopped after verification. The launcher was then revised only to fail closed on startup dependency exit/readiness timeout; lifecycle checks were performed separately.

Stop with Ctrl-C. Temp DB/config files contain local-only secrets and should not be published. For a controlled startup-failure test only, `FITALL_LOCAL_TEST_BIN_DIR` may point to a directory whose `postgrest` is `/usr/bin/false`; no remote URLs or database connections are accepted. Unexpected service exit makes the launcher fail, and startup does not continue after cleanup.
