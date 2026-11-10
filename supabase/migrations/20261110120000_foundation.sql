-- Phase 1: privileges, settings, departments, users and the audit log.
--
-- Rules used in every migration:
--   * Every table has row level security (RLS).
--   * Nothing is reachable by the API roles without an explicit GRANT.
--   * Multi-step workflows are SECURITY DEFINER functions that check
--     permissions themselves and use an empty search_path.

-- -----------------------------------------------------------------------------
-- Default privileges: new objects are closed until granted explicitly.
-- -----------------------------------------------------------------------------
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
alter default privileges revoke execute on functions from public;

create schema private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create schema audit;
revoke all on schema audit from public;

-- -----------------------------------------------------------------------------
-- Generic helpers
-- -----------------------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Audit log: append-only, tamper-evident (each row carries the previous hash).
-- -----------------------------------------------------------------------------
create table audit.log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null,
  actor_id uuid,
  action text not null,
  table_name text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  prev_hash text,
  hash text not null
);

create index log_table_record_idx on audit.log (table_name, record_id);
create index log_occurred_at_idx on audit.log (occurred_at);
create index log_actor_idx on audit.log (actor_id);

revoke all on audit.log from public, anon, authenticated, service_role;

create function audit.compute_hash(
  p_prev text,
  p_occurred_at timestamptz,
  p_actor uuid,
  p_action text,
  p_table text,
  p_record text,
  p_old jsonb,
  p_new jsonb
)
returns text
language sql
stable
set search_path = ''
as $$
  select encode(
    sha256(convert_to(concat_ws(
      '|',
      coalesce(p_prev, ''),
      to_char(p_occurred_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'),
      coalesce(p_actor::text, ''),
      p_action,
      p_table,
      coalesce(p_record, ''),
      coalesce(p_old::text, ''),
      coalesce(p_new::text, '')
    ), 'UTF8')),
    'hex'
  );
$$;

-- Appends one row. A transaction-level lock keeps the hash chain linear.
create function audit.append(
  p_action text,
  p_table text,
  p_record text,
  p_old jsonb default null,
  p_new jsonb default null,
  p_changed text[] default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prev text;
  v_now timestamptz := clock_timestamp();
  v_actor uuid := auth.uid();
begin
  perform pg_advisory_xact_lock(hashtext('green-o:audit-chain'));
  select hash into v_prev from audit.log order by id desc limit 1;

  insert into audit.log (
    occurred_at, actor_id, action, table_name, record_id,
    old_data, new_data, changed_fields, prev_hash, hash
  ) values (
    v_now, v_actor, p_action, p_table, p_record,
    p_old, p_new, p_changed, v_prev,
    audit.compute_hash(v_prev, v_now, v_actor, p_action, p_table, p_record, p_old, p_new)
  );
end;
$$;

-- Row trigger. TG_ARGV[0]: key columns (comma separated, default "id").
-- TG_ARGV[1]: columns ignored when deciding whether an UPDATE changed anything.
create function audit.log_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_changed text[];
  v_keys text[] := string_to_array(coalesce(tg_argv[0], 'id'), ',');
  v_ignored text[] := string_to_array(coalesce(tg_argv[1], 'updated_at'), ',');
  v_record text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    v_old := to_jsonb(old);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    v_new := to_jsonb(new);
  end if;

  if tg_op = 'UPDATE' then
    select array_agg(n.key order by n.key)
      into v_changed
      from jsonb_each(v_new) as n
     where n.value is distinct from (v_old -> n.key)
       and not (n.key = any (v_ignored));
    if v_changed is null then
      return null;
    end if;
  end if;

  select string_agg(coalesce(v_new, v_old) ->> k, ',')
    into v_record
    from unnest(v_keys) as k;

  perform audit.append(
    lower(tg_op),
    tg_table_schema || '.' || tg_table_name,
    v_record,
    v_old,
    v_new,
    v_changed
  );
  return null;
end;
$$;

create function audit.reject_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'سجل التدقيق لا يقبل التعديل أو الحذف' using errcode = '42501';
end;
$$;

create trigger log_immutable
  before update or delete on audit.log
  for each row execute function audit.reject_change();

create trigger log_no_truncate
  before truncate on audit.log
  for each statement execute function audit.reject_change();

-- -----------------------------------------------------------------------------
-- Settings
-- -----------------------------------------------------------------------------
create table public.app_settings (
  id boolean primary key default true
    constraint app_settings_single_row check (id),
  factory_name text not null default 'المصنع'
    constraint app_settings_factory_name_length
    check (char_length(btrim(factory_name)) between 1 and 100),
  timezone text not null default 'Asia/Riyadh',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

insert into public.app_settings default values;

create function private.validate_app_settings()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.factory_name := btrim(new.factory_name);
  if not exists (
    select 1 from pg_catalog.pg_timezone_names where name = new.timezone
  ) then
    raise exception 'المنطقة الزمنية غير معروفة: %', new.timezone using errcode = '22023';
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger app_settings_validate
  before update on public.app_settings
  for each row execute function private.validate_app_settings();

create function private.factory_timezone()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select timezone from public.app_settings where id;
$$;

create function private.factory_today()
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone private.factory_timezone())::date;
$$;

-- Marks which environment this database is. Set by hand once per project:
--   update private.environment_marker set env = 'prod';
-- The seed script refuses to run unless the marker is 'local' or 'dev'.
create table private.environment_marker (
  id boolean primary key default true check (id),
  env text not null default 'unset'
    check (env in ('unset', 'local', 'dev', 'prod')),
  updated_at timestamptz not null default now()
);

insert into private.environment_marker default values;
revoke all on private.environment_marker from public, anon, authenticated;

create function public.environment_marker()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select env from private.environment_marker where id;
$$;

-- Only changes an unset marker, so it can never relabel a dev or prod database.
create function public.mark_local_environment()
returns text
language sql
security definer
set search_path = ''
as $$
  update private.environment_marker
     set env = 'local', updated_at = now()
   where id and env = 'unset';
  select env from private.environment_marker where id;
$$;

-- -----------------------------------------------------------------------------
-- Departments and users
-- -----------------------------------------------------------------------------
create type public.app_role as enum (
  'general_manager',
  'maintenance_manager',
  'production_manager',
  'employee'
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null
    constraint departments_name_length check (char_length(btrim(name)) between 1 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create unique index departments_name_unique on public.departments (lower(btrim(name)));

create trigger departments_updated_at
  before update on public.departments
  for each row execute function private.set_updated_at();

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null
    constraint profiles_full_name_length check (char_length(btrim(full_name)) between 2 and 100),
  role public.app_role not null,
  department_id uuid references public.departments (id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint profiles_department_required
    check (role = 'general_manager' or department_id is not null)
);

create index profiles_department_id_idx on public.profiles (department_id);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create table public.employee_details (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  employee_no text not null
    constraint employee_details_employee_no_format check (employee_no ~ '^[0-9]{1,10}$'),
  phone text
    constraint employee_details_phone_format check (phone is null or phone ~ '^\+?[0-9 ]{6,20}$'),
  job_title text
    constraint employee_details_job_title_length check (job_title is null or char_length(job_title) <= 100),
  notes text
    constraint employee_details_notes_length check (notes is null or char_length(notes) <= 1000),
  updated_at timestamptz not null default now()
);

create unique index employee_details_employee_no_unique on public.employee_details (employee_no);

create trigger employee_details_updated_at
  before update on public.employee_details
  for each row execute function private.set_updated_at();

create function private.guard_department_deactivation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_active and not new.is_active and exists (
    select 1 from public.profiles where department_id = new.id and is_active
  ) then
    raise exception 'لا يمكن إيقاف قسم فيه موظفون نشطون' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger departments_guard_deactivation
  before update on public.departments
  for each row execute function private.guard_department_deactivation();

-- -----------------------------------------------------------------------------
-- Permission helpers. SECURITY DEFINER so they can read profiles without
-- recursing into the profiles policies.
-- -----------------------------------------------------------------------------
create function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and is_active
  );
$$;

create function private.my_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid()) and is_active;
$$;

create function private.my_department()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select department_id from public.profiles where id = (select auth.uid()) and is_active;
$$;

create function private.is_gm()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.my_role() = 'general_manager', false);
$$;

create function private.is_department_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.my_role() in ('maintenance_manager', 'production_manager'), false);
$$;

create function private.is_maintenance_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.my_role() = 'maintenance_manager', false);
$$;

create function private.is_production_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.my_role() = 'production_manager', false);
$$;

-- The general manager manages every department; a department manager manages their own.
create function private.manages_department(p_department uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_gm()
      or (private.is_department_manager() and p_department is not distinct from private.my_department());
$$;

create function private.user_department(p_user uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select department_id from public.profiles where id = p_user;
$$;

-- May the current user create or manage an account with this role and department?
-- General manager: any account. Department manager: employees of their own department.
create function private.can_manage_account(p_department uuid, p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.is_gm() then true
    when private.is_department_manager()
      then p_role = 'employee' and p_department is not distinct from private.my_department()
    else false
  end;
$$;

grant execute on function
  private.is_active_user(),
  private.my_role(),
  private.my_department(),
  private.is_gm(),
  private.is_department_manager(),
  private.is_maintenance_manager(),
  private.is_production_manager(),
  private.manages_department(uuid),
  private.user_department(uuid),
  private.can_manage_account(uuid, public.app_role),
  private.factory_timezone(),
  private.factory_today()
to authenticated;

-- -----------------------------------------------------------------------------
-- Row level security
-- -----------------------------------------------------------------------------
alter table public.app_settings enable row level security;
alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.employee_details enable row level security;

grant select on public.app_settings to authenticated;
grant update (factory_name, timezone) on public.app_settings to authenticated;

create policy app_settings_read on public.app_settings
  for select to authenticated
  using ((select private.is_active_user()));

create policy app_settings_update on public.app_settings
  for update to authenticated
  using ((select private.is_gm()))
  with check ((select private.is_gm()));

grant select on public.departments to authenticated;
grant insert (name, is_active), update (name, is_active) on public.departments to authenticated;

create policy departments_read on public.departments
  for select to authenticated
  using ((select private.is_active_user()));

create policy departments_insert on public.departments
  for insert to authenticated
  with check ((select private.is_gm()));

create policy departments_update on public.departments
  for update to authenticated
  using ((select private.is_gm()))
  with check ((select private.is_gm()));

-- Names, roles and departments are visible to every active user (they appear
-- on tasks, comments and reports). Changes go through the functions below.
grant select on public.profiles to authenticated;

create policy profiles_read on public.profiles
  for select to authenticated
  using ((select private.is_active_user()));

grant select on public.employee_details to authenticated;

create policy employee_details_read on public.employee_details
  for select to authenticated
  using (
    (select private.is_active_user())
    and (
      user_id = (select auth.uid())
      or private.manages_department(private.user_department(user_id))
    )
  );

-- -----------------------------------------------------------------------------
-- Account management functions (called with the manager's own session).
-- The login account itself is created by the server with the Auth admin API.
-- -----------------------------------------------------------------------------
create function public.can_manage_account(p_department_id uuid, p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user() and private.can_manage_account(p_department_id, p_role);
$$;

create function public.create_user_profile(
  p_user_id uuid,
  p_full_name text,
  p_role public.app_role,
  p_department_id uuid,
  p_employee_no text,
  p_phone text default null,
  p_job_title text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_department uuid := case when p_role = 'general_manager' then null else p_department_id end;
begin
  if not private.is_active_user() or not private.can_manage_account(v_department, p_role) then
    raise exception 'ليست لديك صلاحية لإنشاء هذا الحساب' using errcode = '42501';
  end if;

  if v_department is null and p_role <> 'general_manager' then
    raise exception 'يجب اختيار القسم' using errcode = 'P0001';
  end if;

  if v_department is not null
     and not exists (select 1 from public.departments where id = v_department and is_active) then
    raise exception 'القسم غير موجود أو موقوف' using errcode = 'P0001';
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'حساب الدخول غير موجود' using errcode = 'P0001';
  end if;

  insert into public.profiles (id, full_name, role, department_id, created_by)
  values (p_user_id, btrim(p_full_name), p_role, v_department, auth.uid());

  insert into public.employee_details (user_id, employee_no, phone, job_title)
  values (p_user_id, p_employee_no, nullif(btrim(p_phone), ''), nullif(btrim(p_job_title), ''));
end;
$$;

create function public.update_user_profile(
  p_user_id uuid,
  p_full_name text,
  p_role public.app_role,
  p_department_id uuid,
  p_employee_no text,
  p_phone text default null,
  p_job_title text default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.profiles;
  v_department uuid := case when p_role = 'general_manager' then null else p_department_id end;
begin
  select * into v_old from public.profiles where id = p_user_id;
  if not found then
    raise exception 'المستخدم غير موجود' using errcode = 'P0002';
  end if;

  if not private.is_active_user()
     or not private.can_manage_account(v_old.department_id, v_old.role)
     or not private.can_manage_account(v_department, p_role) then
    raise exception 'ليست لديك صلاحية لتعديل هذا الحساب' using errcode = '42501';
  end if;

  if v_department is null and p_role <> 'general_manager' then
    raise exception 'يجب اختيار القسم' using errcode = 'P0001';
  end if;

  if p_role <> v_old.role or v_department is distinct from v_old.department_id then
    if not private.is_gm() then
      raise exception 'تغيير الدور أو القسم من صلاحية المدير العام فقط' using errcode = '42501';
    end if;
    if p_user_id = auth.uid() then
      raise exception 'لا يمكنك تغيير دورك أو قسمك بنفسك' using errcode = '42501';
    end if;
  end if;

  if v_department is not null
     and v_department is distinct from v_old.department_id
     and not exists (select 1 from public.departments where id = v_department and is_active) then
    raise exception 'القسم غير موجود أو موقوف' using errcode = 'P0001';
  end if;

  update public.profiles
     set full_name = btrim(p_full_name),
         role = p_role,
         department_id = v_department
   where id = p_user_id;

  update public.employee_details
     set employee_no = p_employee_no,
         phone = nullif(btrim(p_phone), ''),
         job_title = nullif(btrim(p_job_title), ''),
         notes = nullif(btrim(p_notes), '')
   where user_id = p_user_id;
end;
$$;

create function public.set_user_active(p_user_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.profiles;
begin
  select * into v_old from public.profiles where id = p_user_id;
  if not found then
    raise exception 'المستخدم غير موجود' using errcode = 'P0002';
  end if;

  if not private.is_active_user() or not private.can_manage_account(v_old.department_id, v_old.role) then
    raise exception 'ليست لديك صلاحية لتغيير حالة هذا الحساب' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'لا يمكنك إيقاف حسابك بنفسك' using errcode = '42501';
  end if;

  update public.profiles set is_active = p_active where id = p_user_id;
end;
$$;

-- Checks permission and records the reset. The server then sets the password
-- with the Auth admin API.
create function public.authorize_password_reset(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.profiles;
begin
  select * into v_old from public.profiles where id = p_user_id;
  if not found then
    raise exception 'المستخدم غير موجود' using errcode = 'P0002';
  end if;

  if not private.is_active_user() or not private.can_manage_account(v_old.department_id, v_old.role) then
    raise exception 'ليست لديك صلاحية لإعادة تعيين كلمة المرور' using errcode = '42501';
  end if;

  perform audit.append('password_reset', 'auth.users', p_user_id::text);
end;
$$;

-- Creates the first general manager. Service role only (scripts/bootstrap-admin).
create function public.bootstrap_general_manager(
  p_user_id uuid,
  p_full_name text,
  p_employee_no text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.profiles where role = 'general_manager' and is_active) then
    raise exception 'يوجد مدير عام نشط بالفعل' using errcode = 'P0001';
  end if;

  insert into public.profiles (id, full_name, role)
  values (p_user_id, btrim(p_full_name), 'general_manager');

  insert into public.employee_details (user_id, employee_no)
  values (p_user_id, p_employee_no);
end;
$$;

grant execute on function
  public.can_manage_account(uuid, public.app_role),
  public.create_user_profile(uuid, text, public.app_role, uuid, text, text, text),
  public.update_user_profile(uuid, text, public.app_role, uuid, text, text, text, text),
  public.set_user_active(uuid, boolean),
  public.authorize_password_reset(uuid)
to authenticated;

grant execute on function
  public.environment_marker(),
  public.mark_local_environment(),
  public.bootstrap_general_manager(uuid, text, text)
to service_role;

-- -----------------------------------------------------------------------------
-- Audit triggers
-- -----------------------------------------------------------------------------
create trigger audit_app_settings
  after update on public.app_settings
  for each row execute function audit.log_change('id', 'updated_at,updated_by');

create trigger audit_departments
  after insert or update or delete on public.departments
  for each row execute function audit.log_change('id', 'updated_at');

create trigger audit_profiles
  after insert or update or delete on public.profiles
  for each row execute function audit.log_change('id', 'updated_at');

create trigger audit_employee_details
  after insert or update or delete on public.employee_details
  for each row execute function audit.log_change('user_id', 'updated_at');

-- -----------------------------------------------------------------------------
-- Belt and braces: nothing above is reachable by anon or PUBLIC, whichever
-- role applied this migration.
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;
revoke all on all functions in schema audit from public, anon, authenticated;
