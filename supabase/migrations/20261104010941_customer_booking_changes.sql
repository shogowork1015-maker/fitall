begin;
-- Trusted server supplies identities after session verification. Never expose to clients.
-- Lock the booking before its ticket; deadline is checked AFTER waiting for locks.
create function public.fitall_change_customer_booking(
  p_trainer_id uuid, p_trainee_id uuid, p_booking_id uuid,
  p_expected_at timestamptz, p_new_at timestamptz default null
) returns text language plpgsql security invoker set search_path = '' as $$
declare b public.bookings; ticket public.session_credits; current_time_at timestamptz;
begin
  select * into b from public.bookings where id=p_booking_id
    and trainer_id=p_trainer_id and trainee_id=p_trainee_id for update;
  if not found then raise exception using errcode='P0002', message='Booking not found'; end if;
  if not exists (select 1 from public.trainer_trainee where trainer_id=p_trainer_id
    and trainee_id=p_trainee_id and status='active') then
    raise exception using errcode='42501', message='Inactive customer relationship';
  end if;
  -- A replay never returns another ticket, even if the returned ticket has been reused.
  if b.status='cancelled' and p_new_at is null then return 'already_cancelled'; end if;
  if b.status not in ('pending','confirmed') or b.scheduled_at is distinct from p_expected_at then
    raise exception using errcode='P0003', message='Booking changed; reload';
  end if;
  select * into ticket from public.session_credits where booking_id=b.id for update;
  if not found or ticket.status <> 'scheduled' or ticket.trainer_id <> p_trainer_id
    or ticket.trainee_id <> p_trainee_id then
    raise exception using errcode='P0004', message='Ticket requires trainer assistance';
  end if;
  current_time_at := clock_timestamp();
  if b.scheduled_at < current_time_at + interval '24 hours' then
    raise exception using errcode='P0005', message='Customer change deadline passed';
  end if;
  if p_new_at is not null then
    -- Do not allow moving inside the self-service cutoff window.
    if p_new_at < current_time_at + interval '24 hours' then
      raise exception using errcode='P0005', message='New booking must be at least 24 hours away';
    end if;
    update public.bookings set scheduled_at=p_new_at where id=b.id;
    return 'rescheduled';
  end if;
  update public.bookings set status='cancelled' where id=b.id;
  update public.session_credits set booking_id=null,
    status=case when expires_at is not null and expires_at <= current_time_at then 'expired' else 'available' end
    where id=ticket.id;
  if ticket.expires_at is not null and ticket.expires_at <= current_time_at then return 'returned_expired'; end if;
  return 'returned';
end $$;
revoke all on function public.fitall_change_customer_booking(uuid,uuid,uuid,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.fitall_change_customer_booking(uuid,uuid,uuid,timestamptz,timestamptz) to service_role;
commit;
