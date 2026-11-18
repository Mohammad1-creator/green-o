-- Occupational health and safety: violations.
--
-- The safety manager (and the general manager / developer) defines the
-- violation types, each with a severity and the points it deducts. The
-- safety manager and the safety supervisors record a violation against any
-- employee. The employee is notified, sees it on the phone, and accepts it
-- or objects with a reason; the safety manager then upholds the objection
-- (the violation is cancelled) or rejects it (the violation stands).
-- A violation that is not cancelled deducts its points in the ranking.
--
-- Who sees a violation: the employee, whoever recorded it, the safety
-- manager, the general manager / developer, and the employee's department
-- manager.

-- -----------------------------------------------------------------------------
-- Roles
-- -----------------------------------------------------------------------------
create or replace function private.is_department_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.my_role() in ('maintenance_manager', 'production_manager', 'hse_manager'), false);
$$;

-- Manages safety: violation types, objections, cancelling.
create function private.is_safety_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user()
     and (private.is_gm() or coalesce(private.my_role() = 'hse_manager', false));
$$;

create function private.can_record_violations()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_safety_manager()
      or (private.is_active_user() and coalesce(private.my_role() = 'hse_supervisor', false));
$$;

-- The safety manager also manages the supervisors of their department.
create or replace function private.can_manage_account(p_department uuid, p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.is_gm() then true
    when private.is_department_manager()
      then p_department is not distinct from private.my_department()
       and (p_role = 'employee' or (p_role = 'hse_supervisor' and private.my_role() = 'hse_manager'))
    else false
  end;
$$;

create or replace function private.notify_task_managers(
  p_task uuid,
  p_type text,
  p_title text,
  p_body text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select distinct p.id
      from public.tasks t
      join public.profiles p
        on p.id = t.created_by
        or (p.department_id = t.department_id
            and p.role in ('maintenance_manager', 'production_manager', 'hse_manager'))
     where t.id = p_task
       and p.is_active
       and p.id is distinct from auth.uid()
  loop
    perform private.notify(r.id, p_type, p_title, p_body, '/admin/tasks/' || p_task);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Violation types
-- -----------------------------------------------------------------------------
create type public.violation_severity as enum ('low', 'medium', 'high', 'critical');
create type public.violation_status as enum ('pending', 'accepted', 'objected', 'confirmed', 'cancelled');

create table public.violation_types (
  id uuid primary key default gen_random_uuid(),
  name text not null
    constraint violation_types_name_length check (char_length(btrim(name)) between 2 and 120),
  severity public.violation_severity not null default 'medium',
  points integer not null default 0
    constraint violation_types_points_range check (points between 0 and 1000),
  description text
    constraint violation_types_description_length check (description is null or char_length(description) <= 1000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index violation_types_name_unique on public.violation_types (lower(btrim(name)));

create trigger violation_types_updated_at
  before update on public.violation_types
  for each row execute function private.set_updated_at();

alter table public.violation_types enable row level security;
grant select on public.violation_types to authenticated;
grant insert (name, severity, points, description) on public.violation_types to authenticated;
grant update (name, severity, points, description, is_active) on public.violation_types to authenticated;

create policy violation_types_read on public.violation_types
  for select to authenticated
  using ((select private.is_active_user()));

create policy violation_types_insert on public.violation_types
  for insert to authenticated
  with check ((select private.is_safety_manager()));

create policy violation_types_update on public.violation_types
  for update to authenticated
  using ((select private.is_safety_manager()))
  with check ((select private.is_safety_manager()));

create trigger audit_violation_types
  after insert or update or delete on public.violation_types
  for each row execute function audit.log_change('id', 'updated_at');

-- -----------------------------------------------------------------------------
-- Violations
-- -----------------------------------------------------------------------------
create sequence public.violation_number_seq;

create table public.violations (
  id uuid primary key default gen_random_uuid(),
  number bigint not null default nextval('public.violation_number_seq'),
  employee_id uuid not null references public.profiles (id),
  -- The employee's department when the violation was recorded.
  employee_department_id uuid references public.departments (id),
  type_id uuid not null references public.violation_types (id),
  -- Copied from the type, so later changes to the type leave it alone.
  severity public.violation_severity not null,
  points integer not null
    constraint violations_points_range check (points between 0 and 1000),
  description text not null
    constraint violations_description_length check (char_length(btrim(description)) between 3 and 2000),
  location text
    constraint violations_location_length check (location is null or char_length(location) <= 200),
  occurred_at timestamptz not null,
  recorded_by uuid not null references public.profiles (id),
  status public.violation_status not null default 'pending',
  responded_at timestamptz,
  objection text
    constraint violations_objection_length check (objection is null or char_length(objection) <= 1000),
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  decision_note text
    constraint violations_decision_note_length check (decision_note is null or char_length(decision_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint violations_not_self check (employee_id <> recorded_by),
  constraint violations_objection_reason check (status <> 'objected' or objection is not null)
);

create unique index violations_number_unique on public.violations (number);
create index violations_employee_idx on public.violations (employee_id, created_at);
create index violations_department_idx on public.violations (employee_department_id);
create index violations_recorded_by_idx on public.violations (recorded_by);
create index violations_type_idx on public.violations (type_id);
create index violations_status_idx on public.violations (status);
create index violations_created_idx on public.violations (created_at);

create trigger violations_updated_at
  before update on public.violations
  for each row execute function private.set_updated_at();

alter table public.violations enable row level security;
grant select on public.violations to authenticated;
revoke all on sequence public.violation_number_seq from public, anon, authenticated;

create policy violations_read on public.violations
  for select to authenticated
  using (
    (select private.is_active_user())
    and (
      employee_id = (select auth.uid())
      or recorded_by = (select auth.uid())
      or (select private.is_safety_manager())
      or private.manages_department(employee_department_id)
    )
  );

create trigger audit_violations
  after insert or update or delete on public.violations
  for each row execute function audit.log_change('id', 'updated_at');

create function public.violation_code(p_number bigint)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'V-' || lpad(p_number::text, 6, '0');
$$;

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
create function private.lock_violation(p_id uuid)
returns public.violations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.violations;
begin
  select * into v_row from public.violations where id = p_id for update;
  if not found then
    raise exception 'المخالفة غير موجودة' using errcode = 'P0002';
  end if;
  return v_row;
end;
$$;

-- Safety managers (and whoever recorded it) hear about objections.
create function private.notify_safety_managers(p_violation public.violations, p_type text, p_title text, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select p.id from public.profiles p
     where p.is_active
       and (p.role = 'hse_manager' or p.id = p_violation.recorded_by)
       and p.id is distinct from auth.uid()
  loop
    perform private.notify(r.id, p_type, p_title, p_body, '/admin/safety/violations/' || p_violation.id);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Recording a violation
-- -----------------------------------------------------------------------------
create function public.record_violation(
  p_employee_id uuid,
  p_type_id uuid,
  p_description text,
  p_occurred_at timestamptz default null,
  p_location text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_employee public.profiles;
  v_type public.violation_types;
  v_occurred timestamptz := coalesce(p_occurred_at, now());
  v_description text := btrim(coalesce(p_description, ''));
  v_location text := nullif(btrim(coalesce(p_location, '')), '');
  v_row public.violations;
  r record;
begin
  if not private.can_record_violations() then
    raise exception 'تسجيل المخالفات لمدير السلامة ومشرفيها' using errcode = '42501';
  end if;
  select * into v_employee from public.profiles where id = p_employee_id;
  if not found or not v_employee.is_active then
    raise exception 'الموظف غير موجود أو موقوف' using errcode = 'P0001';
  end if;
  if p_employee_id = (select auth.uid()) then
    raise exception 'لا تسجّل مخالفة على نفسك' using errcode = '42501';
  end if;
  select * into v_type from public.violation_types where id = p_type_id;
  if not found or not v_type.is_active then
    raise exception 'اختر نوع المخالفة' using errcode = 'P0001';
  end if;
  if char_length(v_description) < 3 then
    raise exception 'اكتب وصف المخالفة' using errcode = 'P0001';
  end if;
  if char_length(v_description) > 2000 then
    raise exception 'الوصف طويل جداً' using errcode = 'P0001';
  end if;
  if char_length(v_location) > 200 then
    raise exception 'المكان طويل جداً' using errcode = 'P0001';
  end if;
  if v_occurred > now() + interval '5 minutes' then
    raise exception 'وقت المخالفة في المستقبل' using errcode = 'P0001';
  end if;
  if v_occurred < now() - interval '30 days' then
    raise exception 'لا تُسجَّل مخالفة مضى عليها أكثر من 30 يوماً' using errcode = 'P0001';
  end if;

  insert into public.violations (
    employee_id, employee_department_id, type_id, severity, points,
    description, location, occurred_at, recorded_by
  )
  values (
    p_employee_id, v_employee.department_id, v_type.id, v_type.severity, v_type.points,
    v_description, v_location, v_occurred, auth.uid()
  )
  returning * into v_row;

  perform private.notify(
    p_employee_id,
    'violation_recorded',
    'مخالفة سلامة: ' || v_type.name,
    'راجعها واقبلها أو اعترض عليها.',
    '/m/violations/' || v_row.id
  );

  -- The employee's department managers.
  for r in
    select p.id from public.profiles p
     where p.is_active
       and p.department_id is not distinct from v_employee.department_id
       and v_employee.department_id is not null
       and p.role in ('maintenance_manager', 'production_manager', 'hse_manager')
       and p.id is distinct from auth.uid()
       and p.id <> p_employee_id
  loop
    perform private.notify(
      r.id,
      'violation_recorded',
      'مخالفة سلامة على ' || v_employee.full_name,
      v_type.name,
      '/admin/safety/violations/' || v_row.id
    );
  end loop;

  return v_row.id;
end;
$$;

-- -----------------------------------------------------------------------------
-- The employee's answer
-- -----------------------------------------------------------------------------
create function public.accept_violation(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.violations := private.lock_violation(p_id);
begin
  if not private.is_active_user() or v_row.employee_id <> (select auth.uid()) then
    raise exception 'الرد على المخالفة لصاحبها فقط' using errcode = '42501';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'تم الرد على هذه المخالفة' using errcode = 'P0001';
  end if;
  update public.violations set status = 'accepted', responded_at = now() where id = p_id;
end;
$$;

create function public.object_violation(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.violations := private.lock_violation(p_id);
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if not private.is_active_user() or v_row.employee_id <> (select auth.uid()) then
    raise exception 'الرد على المخالفة لصاحبها فقط' using errcode = '42501';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'تم الرد على هذه المخالفة' using errcode = 'P0001';
  end if;
  if char_length(v_reason) < 3 then
    raise exception 'اكتب سبب الاعتراض' using errcode = 'P0001';
  end if;
  if char_length(v_reason) > 1000 then
    raise exception 'السبب طويل جداً' using errcode = 'P0001';
  end if;

  update public.violations
     set status = 'objected', responded_at = now(), objection = v_reason
   where id = p_id
  returning * into v_row;

  perform private.notify_safety_managers(
    v_row,
    'violation_objected',
    'اعتراض على المخالفة ' || public.violation_code(v_row.number),
    v_reason
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- The safety manager's decision
-- -----------------------------------------------------------------------------
-- p_uphold: true accepts the objection (the violation is cancelled), false
-- rejects it (the violation stands).
create function public.decide_violation_objection(p_id uuid, p_uphold boolean, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.violations := private.lock_violation(p_id);
  v_note text := btrim(coalesce(p_note, ''));
begin
  if not private.is_safety_manager() then
    raise exception 'البت في الاعتراض لمدير السلامة' using errcode = '42501';
  end if;
  if v_row.employee_id = (select auth.uid()) then
    raise exception 'لا تبت في اعتراضك بنفسك' using errcode = '42501';
  end if;
  if v_row.status <> 'objected' then
    raise exception 'لا يوجد اعتراض على هذه المخالفة' using errcode = 'P0001';
  end if;
  if p_uphold is null then
    raise exception 'اختر القرار' using errcode = 'P0001';
  end if;
  if char_length(v_note) < 3 then
    raise exception 'اكتب سبب القرار' using errcode = 'P0001';
  end if;
  if char_length(v_note) > 1000 then
    raise exception 'السبب طويل جداً' using errcode = 'P0001';
  end if;

  update public.violations
     set status = case when p_uphold then 'cancelled'::public.violation_status else 'confirmed' end,
         decided_by = auth.uid(), decided_at = now(), decision_note = v_note
   where id = p_id;

  perform private.notify(
    v_row.employee_id,
    'violation_decided',
    case when p_uphold
      then 'قُبل اعتراضك وأُلغيت المخالفة ' || public.violation_code(v_row.number)
      else 'رُفض اعتراضك على المخالفة ' || public.violation_code(v_row.number)
    end,
    v_note,
    '/m/violations/' || v_row.id
  );
end;
$$;

-- Cancels a violation at any point, with a reason.
create function public.cancel_violation(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.violations := private.lock_violation(p_id);
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if not private.is_safety_manager() then
    raise exception 'إلغاء المخالفات لمدير السلامة' using errcode = '42501';
  end if;
  if v_row.employee_id = (select auth.uid()) then
    raise exception 'لا تلغِ مخالفة عليك بنفسك' using errcode = '42501';
  end if;
  if v_row.status = 'cancelled' then
    raise exception 'المخالفة ملغاة مسبقاً' using errcode = 'P0001';
  end if;
  if char_length(v_reason) < 3 then
    raise exception 'اكتب سبب الإلغاء' using errcode = 'P0001';
  end if;
  if char_length(v_reason) > 1000 then
    raise exception 'السبب طويل جداً' using errcode = 'P0001';
  end if;

  update public.violations
     set status = 'cancelled', decided_by = auth.uid(), decided_at = now(), decision_note = v_reason
   where id = p_id;

  perform private.notify(
    v_row.employee_id,
    'violation_cancelled',
    'أُلغيت المخالفة ' || public.violation_code(v_row.number),
    v_reason,
    '/m/violations/' || v_row.id
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Ranking: task points minus the points of violations that stand.
-- -----------------------------------------------------------------------------
drop function public.report_points_by_person(date, date, uuid);

create function public.report_points_by_person(p_from date, p_to date, p_department_id uuid default null)
returns table (
  user_id uuid,
  full_name text,
  department_name text,
  points bigint,
  awarded bigint,
  deducted bigint,
  tasks integer,
  violations integer
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform private.check_period(p_from, p_to);
  return query
  with awards as (
    select tp.user_id, sum(tp.points)::bigint as awarded, count(distinct tp.task_id)::int as tasks
      from public.task_points tp
     where tp.voided_at is null
       and tp.created_at >= private.period_start(p_from)
       and tp.created_at < private.period_start(p_to + 1)
     group by tp.user_id
  ),
  deductions as (
    select v.employee_id as user_id, sum(v.points)::bigint as deducted, count(*)::int as violations
      from public.violations v
     where v.status <> 'cancelled'
       and v.created_at >= private.period_start(p_from)
       and v.created_at < private.period_start(p_to + 1)
     group by v.employee_id
  ),
  combined as (
    select coalesce(a.user_id, x.user_id) as user_id,
           coalesce(a.awarded, 0) as awarded,
           coalesce(x.deducted, 0) as deducted,
           coalesce(a.tasks, 0) as tasks,
           coalesce(x.violations, 0) as violations
      from awards a
      full join deductions x on x.user_id = a.user_id
  )
  select p.id,
         p.full_name,
         d.name,
         (c.awarded - c.deducted)::bigint,
         c.awarded::bigint,
         c.deducted::bigint,
         c.tasks,
         c.violations
    from combined c
    join public.profiles p on p.id = c.user_id
    left join public.departments d on d.id = p.department_id
   where p_department_id is null or p.department_id = p_department_id
   order by (c.awarded - c.deducted) desc, p.full_name;
end;
$$;

-- -----------------------------------------------------------------------------
-- Privileges
-- -----------------------------------------------------------------------------
revoke all on function
  private.is_safety_manager(),
  private.can_record_violations(),
  private.lock_violation(uuid),
  private.notify_safety_managers(public.violations, text, text, text),
  public.violation_code(bigint),
  public.record_violation(uuid, uuid, text, timestamptz, text),
  public.accept_violation(uuid),
  public.object_violation(uuid, text),
  public.decide_violation_objection(uuid, boolean, text),
  public.cancel_violation(uuid, text),
  public.report_points_by_person(date, date, uuid)
from public, anon;

grant execute on function
  private.is_safety_manager(),
  private.can_record_violations(),
  public.violation_code(bigint),
  public.record_violation(uuid, uuid, text, timestamptz, text),
  public.accept_violation(uuid),
  public.object_violation(uuid, text),
  public.decide_violation_objection(uuid, boolean, text),
  public.cancel_violation(uuid, text),
  public.report_points_by_person(date, date, uuid)
to authenticated;
