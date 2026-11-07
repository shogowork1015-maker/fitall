-- Apply in a maintenance window AFTER reviewing existing active overlaps.
-- Transactional: existing overlaps abort the migration; no booking is deleted.
begin;
create extension if not exists btree_gist;

create function public.fitall_duration_minutes(p_bio text)
returns integer language plpgsql immutable set search_path = '' as $$
declare v jsonb;
begin
  begin v := p_bio::jsonb #> '{fitall_settings,session_duration_minutes}';
  exception when invalid_text_representation then return 60; end;
  if v in ('30'::jsonb, '45'::jsonb, '60'::jsonb, '75'::jsonb, '90'::jsonb, '120'::jsonb)
    then return v::text::integer; end if;
  return 60;
end $$;

alter table public.bookings add column occupied_range tstzrange;
update public.bookings b set occupied_range = tstzrange(b.scheduled_at,
  b.scheduled_at + make_interval(mins => public.fitall_duration_minutes(t.bio)), '[)')
from public.trainer_profiles t where t.id = b.trainer_id;
alter table public.bookings alter column occupied_range set not null;

-- Snapshot the session length. Moving a booking retains its original duration.
create function public.fitall_set_booking_range()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare duration interval;
begin
  if tg_op = 'UPDATE' and old.trainer_id = new.trainer_id then
    duration := upper(old.occupied_range) - lower(old.occupied_range);
  else
    select make_interval(mins => public.fitall_duration_minutes(bio)) into duration
    from public.trainer_profiles where id = new.trainer_id;
  end if;
  if duration is null or new.scheduled_at is null then
    raise exception 'Invalid booking range';
  end if;
  new.occupied_range := tstzrange(new.scheduled_at, new.scheduled_at + duration, '[)');
  return new;
end $$;
create trigger fitall_booking_range before insert or update on public.bookings
for each row execute function public.fitall_set_booking_range();

alter table public.bookings add constraint fitall_no_overlapping_bookings
exclude using gist (trainer_id with =, occupied_range with &&)
where (status in ('pending', 'confirmed', 'completed'));

-- Lock the purchase row before counting or issuing. Concurrent redelivery waits,
-- then sees already-issued credits. A failure rolls the whole RPC back.
create function public.fitall_ensure_purchase_credits(
  p_purchase_id uuid, p_trainer_id uuid, p_trainee_id uuid, p_quantity integer
) returns setof public.session_credits
language plpgsql security invoker set search_path = '' as $$
declare purchase public.session_credit_purchases; issued integer;
begin
  select * into purchase from public.session_credit_purchases
    where id = p_purchase_id for update;
  if not found or purchase.status <> 'paid'
    or purchase.trainer_id is distinct from p_trainer_id
    or purchase.trainee_id is distinct from p_trainee_id
    or purchase.quantity is distinct from p_quantity then
    raise exception 'Invalid paid purchase';
  end if;
  select count(*) into issued from public.session_credits where purchase_id = p_purchase_id;
  if issued > purchase.quantity then raise exception 'Purchase has excess credits'; end if;
  insert into public.session_credits(purchase_id, trainer_id, trainee_id, status)
    select p_purchase_id, p_trainer_id, p_trainee_id, 'available'
    from generate_series(1, purchase.quantity - issued);
  return query select * from public.session_credits where purchase_id = p_purchase_id order by created_at, id;
end $$;

-- Callable only by the server, after validating the customer session and availability.
create function public.fitall_book_customer_ticket(
  p_trainer_id uuid, p_trainee_id uuid, p_scheduled_at timestamptz
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare credit_id uuid; v_booking_id uuid;
begin
  if p_scheduled_at is null or p_scheduled_at <= now() then raise exception 'Invalid booking time'; end if;
  if not exists (select 1 from public.trainer_trainee
    where trainer_id = p_trainer_id and trainee_id = p_trainee_id and status = 'active') then
    raise exception 'Inactive customer relationship';
  end if;
  select id into credit_id from public.session_credits
    where trainer_id = p_trainer_id and trainee_id = p_trainee_id
      and status = 'available' and booking_id is null
      and (expires_at is null or expires_at > now())
    order by created_at, id limit 1 for update skip locked;
  if credit_id is null then raise exception using errcode = 'P0002', message = 'No available ticket'; end if;
  insert into public.bookings(trainer_id, trainee_id, scheduled_at, status, price)
    values(p_trainer_id, p_trainee_id, p_scheduled_at, 'confirmed', 0) returning id into v_booking_id;
  update public.session_credits set booking_id = v_booking_id, status = 'scheduled'
    where id = credit_id;
  return v_booking_id;
end $$;

revoke all on function public.fitall_ensure_purchase_credits(uuid,uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.fitall_ensure_purchase_credits(uuid,uuid,uuid,integer) to service_role;
revoke all on function public.fitall_book_customer_ticket(uuid,uuid,timestamptz) from public, anon, authenticated;
grant execute on function public.fitall_book_customer_ticket(uuid,uuid,timestamptz) to service_role;
commit;
