-- Phase 12: a record of every backup.
--
-- The daily backup runs in GitHub Actions (.github/workflows/backup.yml).
-- It records each run here with the service role, together with the last
-- audit hash at backup time, which anchors the audit chain outside
-- Supabase. The general manager sees the runs; a failed run, or no
-- successful backup for 36 hours in production, notifies them.

create type public.backup_status as enum ('succeeded', 'failed');

create table public.backup_runs (
  id uuid primary key default gen_random_uuid(),
  environment text not null
    constraint backup_runs_environment check (environment in ('local', 'dev', 'prod')),
  status public.backup_status not null,
  started_at timestamptz not null,
  finished_at timestamptz not null default now(),
  database_bytes bigint,
  storage_bytes bigint,
  storage_files integer,
  audit_last_id bigint,
  audit_last_hash text,
  -- Where the encrypted file went (object key, no credentials).
  location text
    constraint backup_runs_location_length check (location is null or char_length(location) <= 500),
  run_url text
    constraint backup_runs_run_url_length check (run_url is null or char_length(run_url) <= 500),
  error text
    constraint backup_runs_error_length check (error is null or char_length(error) <= 2000),
  created_at timestamptz not null default now()
);

create index backup_runs_finished_idx on public.backup_runs (finished_at desc);

alter table public.backup_runs enable row level security;
grant select on public.backup_runs to authenticated;

create policy backup_runs_read on public.backup_runs
  for select to authenticated
  using ((select private.is_active_user()) and (select private.is_gm()));

create trigger audit_backup_runs
  after insert or update or delete on public.backup_runs
  for each row execute function audit.log_change('id', '');

-- -----------------------------------------------------------------------------
-- For the backup job (service role only)
-- -----------------------------------------------------------------------------
create function public.audit_chain_head()
returns table (last_id bigint, last_hash text)
language sql
stable
security definer
set search_path = ''
as $$
  select id, hash from audit.log order by id desc limit 1;
$$;

-- For checking a restored copy: the full chain check, without recording it.
create function public.audit_chain_verify()
returns table (checked_rows bigint, last_id bigint, last_hash text, ok boolean, first_bad_id bigint, problem text)
language sql
stable
security definer
set search_path = ''
as $$
  select * from audit.verify_chain();
$$;

create function private.notify_general_managers(p_type text, p_title text, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gm uuid;
begin
  for v_gm in select id from public.profiles where role = 'general_manager' and is_active loop
    perform private.notify(v_gm, p_type, p_title, p_body, '/admin/settings#backups');
  end loop;
end;
$$;

create function public.record_backup_run(
  p_status public.backup_status,
  p_started_at timestamptz,
  p_database_bytes bigint default null,
  p_storage_bytes bigint default null,
  p_storage_files integer default null,
  p_audit_last_id bigint default null,
  p_audit_last_hash text default null,
  p_location text default null,
  p_run_url text default null,
  p_error text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_env text := coalesce((select env from private.environment_marker where id), 'unset');
begin
  if v_env not in ('local', 'dev', 'prod') then
    raise exception 'environment marker is not set' using errcode = 'P0001';
  end if;
  insert into public.backup_runs (
    environment, status, started_at, database_bytes, storage_bytes, storage_files,
    audit_last_id, audit_last_hash, location, run_url, error
  ) values (
    v_env, p_status, p_started_at, p_database_bytes, p_storage_bytes, p_storage_files,
    p_audit_last_id, p_audit_last_hash, left(p_location, 500), left(p_run_url, 500), left(p_error, 2000)
  )
  returning id into v_id;

  if p_status = 'failed' then
    perform private.notify_general_managers(
      'backup_failed',
      'فشل النسخ الاحتياطي اليومي',
      coalesce(left(p_error, 300), 'راجع سجل التشغيل في GitHub Actions')
    );
  end if;
  return v_id;
end;
$$;

-- Production only: no successful backup for 36 hours is worth a warning.
create function private.check_backup_freshness()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select env from private.environment_marker where id) <> 'prod' then
    return;
  end if;
  if not exists (
    select 1 from public.backup_runs
     where status = 'succeeded' and finished_at > now() - interval '36 hours'
  ) then
    perform private.notify_general_managers(
      'backup_stale',
      'لا توجد نسخة احتياطية حديثة',
      'آخر نسخة احتياطية ناجحة أقدم من 36 ساعة. راجع سير النسخ في GitHub Actions.'
    );
  end if;
end;
$$;

select cron.schedule('green-o-backup-freshness', '0 6 * * *', $$select private.check_backup_freshness()$$);

-- -----------------------------------------------------------------------------
-- Privileges
-- -----------------------------------------------------------------------------
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;

grant execute on function
  public.audit_chain_head(),
  public.audit_chain_verify(),
  public.record_backup_run(public.backup_status, timestamptz, bigint, bigint, integer, bigint, text, text, text, text)
to service_role;
