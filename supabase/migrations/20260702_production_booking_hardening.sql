-- Production hardening for paid public booking.
-- Holds prevent two customers from paying for the same popular slot at the same time.

create table if not exists booking_holds (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references trainer_profiles(id) on delete cascade,
  scheduled_at timestamptz not null,
  customer_email text not null,
  stripe_checkout_session_id text unique,
  status text not null default 'active' check (status in ('active', 'converted', 'expired', 'cancelled')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_booking_holds_trainer_active
  on booking_holds(trainer_id, scheduled_at, expires_at)
  where status = 'active';

create unique index if not exists idx_bookings_one_active_exact_start
  on bookings(trainer_id, scheduled_at)
  where status in ('pending', 'confirmed', 'completed');

create unique index if not exists idx_sales_records_one_per_booking
  on sales_records(booking_id);

create unique index if not exists idx_trainer_trainee_unique_customer
  on trainer_trainee(trainer_id, trainee_id)
  where trainee_id is not null;

create or replace function update_booking_holds_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_booking_holds_updated_at on booking_holds;
create trigger update_booking_holds_updated_at
  before update on booking_holds
  for each row execute function update_booking_holds_updated_at();
