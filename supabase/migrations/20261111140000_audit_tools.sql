-- Phase 11: tools for the audit trail.
--
-- The audit schema is not exposed to the API, so the general manager reads
-- the log through the functions below. A daily job recomputes the whole
-- hash chain in order and records the result; if any row was changed,
-- removed or inserted out of turn, every general manager is notified.

create table audit.chain_checks (
  id bigint generated always as identity primary key,
  checked_at timestamptz not null default now(),
  checked_by uuid,
  checked_rows bigint not null,
  last_id bigint,
  last_hash text,
  ok boolean not null,
  first_bad_id bigint,
  problem text
);

revoke all on audit.chain_checks from public, anon, authenticated, service_role;

create trigger chain_checks_immutable
  before update or delete on audit.chain_checks
  for each row execute function audit.reject_change();

-- Walks the chain from the first row: each row must point at the hash of
-- the row before it, and its own hash must match its contents.
create function audit.verify_chain()
returns table (
  checked_rows bigint,
  last_id bigint,
  last_hash text,
  ok boolean,
  first_bad_id bigint,
  problem text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r audit.log;
  v_prev text;
  v_last_id bigint;
  v_count bigint := 0;
begin
  for r in select * from audit.log order by id loop
    v_count := v_count + 1;
    if r.prev_hash is distinct from v_prev then
      return query select v_count, r.id, r.hash, false, r.id,
        'السطر لا يشير إلى بصمة السطر الذي قبله'::text;
      return;
    end if;
    if r.hash <> audit.compute_hash(
      r.prev_hash, r.occurred_at, r.actor_id, r.action, r.table_name, r.record_id, r.old_data, r.new_data
    ) then
      return query select v_count, r.id, r.hash, false, r.id,
        'بصمة السطر لا تطابق محتواه'::text;
      return;
    end if;
    v_prev := r.hash;
    v_last_id := r.id;
  end loop;
  return query select v_count, v_last_id, v_prev, true, null::bigint, null::text;
end;
$$;

create function private.record_chain_check()
returns audit.chain_checks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result record;
  v_check audit.chain_checks;
  v_gm uuid;
begin
  select * into v_result from audit.verify_chain();
  insert into audit.chain_checks (checked_by, checked_rows, last_id, last_hash, ok, first_bad_id, problem)
  values (auth.uid(), v_result.checked_rows, v_result.last_id, v_result.last_hash, v_result.ok,
          v_result.first_bad_id, v_result.problem)
  returning * into v_check;

  if not v_result.ok then
    for v_gm in
      select id from public.profiles where role = 'general_manager' and is_active
    loop
      perform private.notify(
        v_gm,
        'audit_chain_broken',
        'تنبيه: سجل التدقيق تغيّر بطريقة غير طبيعية',
        v_result.problem || ' (رقم السطر ' || v_result.first_bad_id || ')',
        '/admin/audit'
      );
    end loop;
  end if;
  return v_check;
end;
$$;

-- 00:30 UTC: after midnight in Riyadh, before the working day.
select cron.schedule('green-o-audit-chain', '30 0 * * *', $$select private.record_chain_check()$$);

-- -----------------------------------------------------------------------------
-- For the general manager
-- -----------------------------------------------------------------------------
create function private.require_gm()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_active_user() or not private.is_gm() then
    raise exception 'سجل التدقيق للمدير العام فقط' using errcode = '42501';
  end if;
end;
$$;

create function public.audit_chain_status()
returns table (
  checked_at timestamptz,
  checked_rows bigint,
  ok boolean,
  first_bad_id bigint,
  problem text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_gm();
  return query
  select c.checked_at, c.checked_rows, c.ok, c.first_bad_id, c.problem
    from audit.chain_checks c
   order by c.id desc
   limit 1;
end;
$$;

create function public.run_audit_chain_check()
returns table (
  checked_at timestamptz,
  checked_rows bigint,
  ok boolean,
  first_bad_id bigint,
  problem text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_check audit.chain_checks;
begin
  perform private.require_gm();
  v_check := private.record_chain_check();
  return query select v_check.checked_at, v_check.checked_rows, v_check.ok, v_check.first_bad_id, v_check.problem;
end;
$$;

-- Newest first; pass the smallest id of a page as p_before_id for the next.
create function public.list_audit_log(
  p_from date default null,
  p_to date default null,
  p_actor_id uuid default null,
  p_table text default null,
  p_action text default null,
  p_record_id text default null,
  p_before_id bigint default null,
  p_limit integer default 50
)
returns table (
  id bigint,
  occurred_at timestamptz,
  actor_id uuid,
  actor_name text,
  action text,
  table_name text,
  record_id text,
  changed_fields text[],
  old_data jsonb,
  new_data jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform private.require_gm();
  return query
  select l.id, l.occurred_at, l.actor_id, p.full_name, l.action, l.table_name, l.record_id,
         l.changed_fields, l.old_data, l.new_data
    from audit.log l
    left join public.profiles p on p.id = l.actor_id
   where (p_from is null or l.occurred_at >= private.period_start(p_from))
     and (p_to is null or l.occurred_at < private.period_start(p_to + 1))
     and (p_actor_id is null or l.actor_id = p_actor_id)
     and (p_table is null or l.table_name = p_table)
     and (p_action is null or l.action = p_action)
     and (p_record_id is null or l.record_id = p_record_id)
     and (p_before_id is null or l.id < p_before_id)
   order by l.id desc
   limit least(greatest(coalesce(p_limit, 50), 1), 1000);
end;
$$;

-- The tables that have entries, for the filter.
create function public.audit_tables()
returns table (table_name text, entries bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform private.require_gm();
  return query
  select l.table_name, count(*) from audit.log l group by l.table_name order by l.table_name;
end;
$$;

-- -----------------------------------------------------------------------------
-- Privileges
-- -----------------------------------------------------------------------------
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;
revoke all on all functions in schema audit from public, anon, authenticated;

grant execute on function
  public.audit_chain_status(),
  public.run_audit_chain_check(),
  public.list_audit_log(date, date, uuid, text, text, text, bigint, integer),
  public.audit_tables()
to authenticated;
