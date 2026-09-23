-- FITALL ticket-style reservation foundation.
-- A Stripe payment creates a purchase record and one or more session credits.
-- A booking consumes one credit by setting session_credits.booking_id.

create table if not exists session_credit_purchases (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references trainer_profiles(id) on delete cascade,
  trainee_id uuid not null references trainee_profiles(id) on delete cascade,
  plan_id uuid references plans(id) on delete set null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  amount integer not null default 0,
  quantity integer not null default 1 check (quantity > 0),
  status text not null default 'paid' check (status in ('pending', 'paid', 'refunded', 'cancelled')),
  purchased_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists session_credits (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references session_credit_purchases(id) on delete cascade,
  trainer_id uuid not null references trainer_profiles(id) on delete cascade,
  trainee_id uuid not null references trainee_profiles(id) on delete cascade,
  booking_id uuid references bookings(id) on delete set null,
  status text not null default 'available' check (status in ('available', 'scheduled', 'used', 'expired', 'refunded')),
  expires_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_session_credit_purchases_trainer_id
  on session_credit_purchases(trainer_id);

create index if not exists idx_session_credit_purchases_trainee_id
  on session_credit_purchases(trainee_id);

create index if not exists idx_session_credits_trainer_id
  on session_credits(trainer_id);

create index if not exists idx_session_credits_trainee_id
  on session_credits(trainee_id);

create index if not exists idx_session_credits_booking_id
  on session_credits(booking_id);

create unique index if not exists idx_session_credits_one_credit_per_booking
  on session_credits(booking_id)
  where booking_id is not null;

create or replace function update_session_credit_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_session_credit_purchases_updated_at on session_credit_purchases;
create trigger update_session_credit_purchases_updated_at
  before update on session_credit_purchases
  for each row execute function update_session_credit_updated_at();

drop trigger if exists update_session_credits_updated_at on session_credits;
create trigger update_session_credits_updated_at
  before update on session_credits
  for each row execute function update_session_credit_updated_at();
