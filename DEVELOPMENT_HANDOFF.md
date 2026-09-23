# Development Handoff

This repository contains the Limitless App web/PWA application. On the original
computer it lives in `fitall/web`, but the Git repository starts at that `web`
directory. After cloning, run commands directly in the cloned repository; there
is no extra `web` directory inside it. The sibling `mobile` project is not part
of this repository.

## Start on Another Computer

Once the development checkpoint has been pushed to GitHub:

```bash
git clone https://github.com/shogowork1015-maker/fitall.git
cd fitall
npm ci
```

Use Node.js 24 to match the original development machine. Before starting the
app, transfer `.env.local` from the original computer through a secure channel,
or configure the environment variables for your own development environment.
The file is intentionally excluded from Git. Never paste its values into this
document or commit it.

```bash
npm run dev
```

Open <http://localhost:3000>. If that port is occupied:

```bash
npm run dev -- --port 3002
```

## Configuration and Data

- `STRIPE_BOOKING_SETUP.md` describes payment and notification configuration.
- `LINE_RICH_MENU_SETUP.md` describes LINE rich-menu configuration.
- `supabase/migrations/` contains incremental database migrations. These assume
  the application's existing database schema, not an empty database.
- External accounts, database records, uploaded data, and local credentials are
  not included in a Git commit. Cloning does not back them up or recreate them.
- Stripe's local webhook listener must run on the new computer for payment
  completion tests. Update that computer's webhook signing secret if necessary.
- LINE callbacks need a reachable public URL; a phone cannot use the other
  computer's `localhost` address.

## Development Modes

- Trainer authentication bypass is enabled by default in development. Set
  `FITALL_DEV_AUTH_BYPASS=0` to exercise the real login flow.
- `FITALL_CUSTOMER_PREVIEW=1` enables the customer preview fallback when no real
  customer session is available and development authentication bypass is on.
- Preview screens do not prove that database, payment, or LINE connections work.

## Checks

```bash
npm run lint
npm run build
```

This checkpoint preserves work in progress. It is not a production-release
approval or confirmation that external services are currently connected.
Local screenshots and generated build output are intentionally excluded.
