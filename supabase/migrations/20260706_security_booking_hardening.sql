-- Security and booking consistency hardening.
-- Apply this before exposing the customer app to real customers.

create extension if not exists pgcrypto;

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

create unique index if not exists idx_sales_records_one_per_booking
  on sales_records(booking_id);

create unique index if not exists idx_trainer_trainee_unique_customer
  on trainer_trainee(trainer_id, trainee_id)
  where trainee_id is not null;

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

update booking_holds
set status = 'expired'
where status = 'active'
  and expires_at <= now();

drop index if exists idx_booking_holds_trainer_active;
create unique index if not exists idx_booking_holds_one_active_exact_start
  on booking_holds(trainer_id, scheduled_at)
  where status = 'active';

drop index if exists idx_bookings_one_active_exact_start;
create unique index if not exists idx_bookings_one_confirmed_exact_start
  on bookings(trainer_id, scheduled_at)
  where status in ('confirmed', 'completed');

create or replace function app_current_trainer_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from trainer_profiles
  where user_id = auth.uid()
  limit 1
$$;

create or replace function app_current_trainee_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from trainee_profiles
  where user_id = auth.uid()
  limit 1
$$;

create or replace function app_is_trainer_for_trainee(target_trainee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from trainer_trainee tt
    where tt.trainer_id = app_current_trainer_profile_id()
      and tt.trainee_id = target_trainee_id
      and tt.status = 'active'
  )
$$;

create or replace function app_is_trainee_of_trainer(target_trainer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from trainer_trainee tt
    where tt.trainer_id = target_trainer_id
      and tt.trainee_id = app_current_trainee_profile_id()
      and tt.status = 'active'
  )
$$;

create or replace function app_can_read_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_user_id = auth.uid()
    or exists (
      select 1
      from trainee_profiles tp
      where tp.user_id = target_user_id
        and app_is_trainer_for_trainee(tp.id)
    )
    or exists (
      select 1
      from trainer_profiles tp
      where tp.user_id = target_user_id
        and app_is_trainee_of_trainer(tp.id)
    )
$$;

create or replace function app_can_access_booking(target_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from bookings b
    where b.id = target_booking_id
      and (
        b.trainer_id = app_current_trainer_profile_id()
        or b.trainee_id = app_current_trainee_profile_id()
      )
  )
$$;

alter table users enable row level security;
alter table trainer_profiles enable row level security;
alter table trainee_profiles enable row level security;
alter table trainer_trainee enable row level security;
alter table plans enable row level security;
alter table trainer_availability enable row level security;
alter table bookings enable row level security;
alter table sales_records enable row level security;
alter table session_credit_purchases enable row level security;
alter table session_credits enable row level security;
alter table booking_holds enable row level security;

drop policy if exists users_select_own_or_related on users;
create policy users_select_own_or_related on users
  for select
  using (app_can_read_user(id));

drop policy if exists users_insert_own on users;
create policy users_insert_own on users
  for insert
  with check (id = auth.uid());

drop policy if exists users_update_own on users;
create policy users_update_own on users
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists trainer_profiles_select_own_or_customer on trainer_profiles;
create policy trainer_profiles_select_own_or_customer on trainer_profiles
  for select
  using (user_id = auth.uid() or app_is_trainee_of_trainer(id));

drop policy if exists trainer_profiles_insert_own on trainer_profiles;
create policy trainer_profiles_insert_own on trainer_profiles
  for insert
  with check (user_id = auth.uid());

drop policy if exists trainer_profiles_update_own on trainer_profiles;
create policy trainer_profiles_update_own on trainer_profiles
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists trainee_profiles_select_own_or_trainer on trainee_profiles;
create policy trainee_profiles_select_own_or_trainer on trainee_profiles
  for select
  using (user_id = auth.uid() or app_is_trainer_for_trainee(id));

drop policy if exists trainee_profiles_insert_own on trainee_profiles;
create policy trainee_profiles_insert_own on trainee_profiles
  for insert
  with check (user_id = auth.uid());

drop policy if exists trainee_profiles_update_own on trainee_profiles;
create policy trainee_profiles_update_own on trainee_profiles
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists trainer_trainee_select_participant on trainer_trainee;
create policy trainer_trainee_select_participant on trainer_trainee
  for select
  using (
    trainer_id = app_current_trainer_profile_id()
    or trainee_id = app_current_trainee_profile_id()
  );

drop policy if exists trainer_trainee_write_trainer on trainer_trainee;
create policy trainer_trainee_write_trainer on trainer_trainee
  for all
  using (trainer_id = app_current_trainer_profile_id())
  with check (trainer_id = app_current_trainer_profile_id());

drop policy if exists plans_select_trainer_or_customer on plans;
create policy plans_select_trainer_or_customer on plans
  for select
  using (
    trainer_id = app_current_trainer_profile_id()
    or app_is_trainee_of_trainer(trainer_id)
  );

drop policy if exists plans_write_trainer on plans;
create policy plans_write_trainer on plans
  for all
  using (trainer_id = app_current_trainer_profile_id())
  with check (trainer_id = app_current_trainer_profile_id());

drop policy if exists trainer_availability_select_trainer_or_customer on trainer_availability;
create policy trainer_availability_select_trainer_or_customer on trainer_availability
  for select
  using (
    trainer_id = app_current_trainer_profile_id()
    or app_is_trainee_of_trainer(trainer_id)
  );

drop policy if exists trainer_availability_write_trainer on trainer_availability;
create policy trainer_availability_write_trainer on trainer_availability
  for all
  using (trainer_id = app_current_trainer_profile_id())
  with check (trainer_id = app_current_trainer_profile_id());

drop policy if exists bookings_select_participant on bookings;
create policy bookings_select_participant on bookings
  for select
  using (
    trainer_id = app_current_trainer_profile_id()
    or trainee_id = app_current_trainee_profile_id()
  );

drop policy if exists bookings_insert_participant on bookings;
create policy bookings_insert_participant on bookings
  for insert
  with check (
    trainer_id = app_current_trainer_profile_id()
    or (
      trainee_id = app_current_trainee_profile_id()
      and app_is_trainee_of_trainer(trainer_id)
    )
  );

drop policy if exists bookings_update_trainer on bookings;
create policy bookings_update_trainer on bookings
  for update
  using (trainer_id = app_current_trainer_profile_id())
  with check (trainer_id = app_current_trainer_profile_id());

drop policy if exists sales_records_select_trainer on sales_records;
create policy sales_records_select_trainer on sales_records
  for select
  using (trainer_id = app_current_trainer_profile_id());

drop policy if exists sales_records_write_trainer on sales_records;
create policy sales_records_write_trainer on sales_records
  for all
  using (trainer_id = app_current_trainer_profile_id())
  with check (trainer_id = app_current_trainer_profile_id());

drop policy if exists session_credit_purchases_select_participant on session_credit_purchases;
create policy session_credit_purchases_select_participant on session_credit_purchases
  for select
  using (
    trainer_id = app_current_trainer_profile_id()
    or trainee_id = app_current_trainee_profile_id()
  );

drop policy if exists session_credit_purchases_write_trainer on session_credit_purchases;
create policy session_credit_purchases_write_trainer on session_credit_purchases
  for all
  using (trainer_id = app_current_trainer_profile_id())
  with check (trainer_id = app_current_trainer_profile_id());

drop policy if exists session_credits_select_participant on session_credits;
create policy session_credits_select_participant on session_credits
  for select
  using (
    trainer_id = app_current_trainer_profile_id()
    or trainee_id = app_current_trainee_profile_id()
  );

drop policy if exists session_credits_write_trainer on session_credits;
create policy session_credits_write_trainer on session_credits
  for all
  using (trainer_id = app_current_trainer_profile_id())
  with check (trainer_id = app_current_trainer_profile_id());

drop policy if exists booking_holds_select_trainer on booking_holds;
create policy booking_holds_select_trainer on booking_holds
  for select
  using (trainer_id = app_current_trainer_profile_id());

do $$
begin
  if to_regclass('public.booking_changes') is not null then
    execute 'alter table booking_changes enable row level security';
    execute 'drop policy if exists booking_changes_select_participant on booking_changes';
    execute 'create policy booking_changes_select_participant on booking_changes for select using (app_can_access_booking(booking_id))';
    execute 'drop policy if exists booking_changes_insert_participant on booking_changes';
    execute 'create policy booking_changes_insert_participant on booking_changes for insert with check (app_can_access_booking(booking_id) and proposed_by = auth.uid())';
    execute 'drop policy if exists booking_changes_update_participant on booking_changes';
    execute 'create policy booking_changes_update_participant on booking_changes for update using (app_can_access_booking(booking_id)) with check (app_can_access_booking(booking_id))';
  end if;

  if to_regclass('public.workout_logs') is not null then
    execute $fn$
      create or replace function app_can_access_workout_log(target_log_id uuid)
      returns boolean
      language sql
      stable
      security definer
      set search_path = public
      as $body$
        select exists (
          select 1
          from workout_logs wl
          where wl.id = target_log_id
            and (
              wl.trainee_id = app_current_trainee_profile_id()
              or app_is_trainer_for_trainee(wl.trainee_id)
            )
        )
      $body$
    $fn$;
    execute 'alter table workout_logs enable row level security';
    execute 'drop policy if exists workout_logs_select_participant on workout_logs';
    execute 'create policy workout_logs_select_participant on workout_logs for select using (trainee_id = app_current_trainee_profile_id() or app_is_trainer_for_trainee(trainee_id))';
    execute 'drop policy if exists workout_logs_insert_participant on workout_logs';
    execute 'create policy workout_logs_insert_participant on workout_logs for insert with check (trainee_id = app_current_trainee_profile_id() or app_is_trainer_for_trainee(trainee_id))';
    execute 'drop policy if exists workout_logs_update_participant on workout_logs';
    execute 'create policy workout_logs_update_participant on workout_logs for update using (trainee_id = app_current_trainee_profile_id() or app_is_trainer_for_trainee(trainee_id)) with check (trainee_id = app_current_trainee_profile_id() or app_is_trainer_for_trainee(trainee_id))';
  end if;

  if to_regclass('public.workout_sets') is not null
     and to_regclass('public.workout_logs') is not null then
    execute 'alter table workout_sets enable row level security';
    execute 'drop policy if exists workout_sets_select_participant on workout_sets';
    execute 'create policy workout_sets_select_participant on workout_sets for select using (app_can_access_workout_log(log_id))';
    execute 'drop policy if exists workout_sets_insert_participant on workout_sets';
    execute 'create policy workout_sets_insert_participant on workout_sets for insert with check (app_can_access_workout_log(log_id))';
    execute 'drop policy if exists workout_sets_update_participant on workout_sets';
    execute 'create policy workout_sets_update_participant on workout_sets for update using (app_can_access_workout_log(log_id)) with check (app_can_access_workout_log(log_id))';
  end if;

  if to_regclass('public.body_records') is not null then
    execute 'alter table body_records enable row level security';
    execute 'drop policy if exists body_records_select_participant on body_records';
    execute 'create policy body_records_select_participant on body_records for select using (trainee_id = app_current_trainee_profile_id() or app_is_trainer_for_trainee(trainee_id))';
    execute 'drop policy if exists body_records_write_participant on body_records';
    execute 'create policy body_records_write_participant on body_records for all using (trainee_id = app_current_trainee_profile_id() or app_is_trainer_for_trainee(trainee_id)) with check (trainee_id = app_current_trainee_profile_id() or app_is_trainer_for_trainee(trainee_id))';
  end if;

  if to_regclass('public.exercises') is not null then
    execute 'alter table exercises enable row level security';
    execute 'drop policy if exists exercises_select_authenticated on exercises';
    execute 'create policy exercises_select_authenticated on exercises for select using (auth.role() = ''authenticated'')';
    execute 'drop policy if exists exercises_insert_authenticated on exercises';
    execute 'create policy exercises_insert_authenticated on exercises for insert with check (auth.role() = ''authenticated'')';
  end if;
end $$;
