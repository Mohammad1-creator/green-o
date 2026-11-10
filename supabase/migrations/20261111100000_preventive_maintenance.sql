-- Phase 7: preventive maintenance plans that create their tasks automatically.
--
-- Occurrences are computed from the plan's start date (start + n x interval),
-- so monthly plans never drift at month ends. A job runs every hour and, in
-- the factory's time zone, creates the task for each occurrence that has
-- entered its lead window. If several occurrences were missed, only the
-- latest gets a task. A unique key makes double creation impossible.

create type public.interval_unit as enum ('day', 'week', 'month');

create table public.pm_plans (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines (id),
  department_id uuid not null references public.departments (id),
  title text not null
    constraint pm_plans_title_length check (char_length(btrim(title)) between 1 and 200),
  instructions text
    constraint pm_plans_instructions_length check (instructions is null or char_length(instructions) <= 5000),
  interval_unit public.interval_unit not null,
  interval_count integer not null
    constraint pm_plans_interval_count check (interval_count between 1 and 365),
  start_date date not null,
  next_due_date date not null,
  lead_days integer not null default 0
    constraint pm_plans_lead_days check (lead_days between 0 and 60),
  assignee_user_id uuid references public.profiles (id),
  assignee_team_id uuid references public.teams (id),
  is_active boolean not null default true,
  last_generated_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint pm_plans_one_assignee check (num_nonnulls(assignee_user_id, assignee_team_id) = 1)
);

create index pm_plans_due_idx on public.pm_plans (next_due_date) where is_active;

create trigger pm_plans_updated_at
  before update on public.pm_plans
  for each row execute function private.set_updated_at();

alter table public.tasks
  add column pm_plan_id uuid references public.pm_plans (id),
  add column pm_due_date date;

create unique index tasks_pm_occurrence_unique on public.tasks (pm_plan_id, pm_due_date)
  where pm_plan_id is not null;

alter table public.pm_plans enable row level security;
grant select on public.pm_plans to authenticated;

create policy pm_plans_read on public.pm_plans
  for select to authenticated
  using ((select private.is_active_user()) and private.manages_department(department_id));

create trigger audit_pm_plans
  after insert or update or delete on public.pm_plans
  for each row execute function audit.log_change('id', 'updated_at,last_generated_at');

-- -----------------------------------------------------------------------------
-- Occurrences
-- -----------------------------------------------------------------------------
-- The first occurrence on or after p_on_or_after.
create function public.pm_next_occurrence(
  p_start date,
  p_unit public.interval_unit,
  p_count integer,
  p_on_or_after date
)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_step integer;
  v_index integer;
  v_date date;
  v_age interval;
begin
  if p_on_or_after <= p_start then
    return p_start;
  end if;

  if p_unit in ('day', 'week') then
    v_step := p_count * case when p_unit = 'week' then 7 else 1 end;
    v_index := ceil((p_on_or_after - p_start)::numeric / v_step)::integer;
    return p_start + v_index * v_step;
  end if;

  -- Months: start just below the answer, then step forward.
  v_age := age(p_on_or_after, p_start);
  v_index := greatest(
    0,
    ((extract(year from v_age) * 12 + extract(month from v_age))::integer / p_count) - 1
  );
  loop
    v_date := (p_start + make_interval(months => v_index * p_count))::date;
    exit when v_date >= p_on_or_after;
    v_index := v_index + 1;
  end loop;
  return v_date;
end;
$$;

-- -----------------------------------------------------------------------------
-- Task creation: the "due time in the past" check moves to the manager-facing
-- functions, because a missed preventive occurrence is due in the past.
-- -----------------------------------------------------------------------------
create or replace function private.create_task_record(
  p_kind public.task_kind,
  p_title text,
  p_description text,
  p_due_at timestamptz,
  p_department uuid,
  p_assignee_ids uuid[],
  p_team_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task uuid;
  v_people uuid[];
  v_title text := btrim(coalesce(p_title, ''));
begin
  if char_length(v_title) = 0 then
    raise exception 'اكتب عنوان المهمة' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.departments where id = p_department and is_active) then
    raise exception 'القسم غير موجود أو موقوف' using errcode = 'P0001';
  end if;

  v_people := private.resolve_assignees(p_department, p_assignee_ids, p_team_id);

  insert into public.tasks (kind, title, description, department_id, due_at, assigned_team_id, created_by)
  values (p_kind, left(v_title, 200), nullif(btrim(p_description), ''), p_department, p_due_at, p_team_id, auth.uid())
  returning id into v_task;

  insert into public.task_assignees (task_id, user_id)
  select v_task, person from unnest(v_people) as person;

  perform private.log_task_event(v_task, 'created', null, 'new');
  perform private.notify_task_assignees(
    v_task,
    'task_assigned',
    'مهمة جديدة: ' || left(v_title, 180),
    coalesce('من ' || private.my_name(), 'مهمة جديدة مسندة إليك')
  );
  return v_task;
end;
$$;

create or replace function public.create_task(
  p_title text,
  p_description text default null,
  p_due_at timestamptz default null,
  p_department_id uuid default null,
  p_assignee_ids uuid[] default null,
  p_team_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_department uuid := coalesce(p_department_id, private.my_department());
begin
  if not private.is_active_user() or not (private.is_gm() or private.is_department_manager()) then
    raise exception 'إنشاء المهام للمديرين فقط' using errcode = '42501';
  end if;
  if v_department is null then
    raise exception 'اختر القسم' using errcode = 'P0001';
  end if;
  if not private.manages_department(v_department) then
    raise exception 'لا يمكنك إنشاء مهام لقسم آخر' using errcode = '42501';
  end if;
  if p_due_at is not null and p_due_at < now() - interval '5 minutes' then
    raise exception 'موعد الاستحقاق مضى. اختر موعداً قادماً' using errcode = 'P0001';
  end if;
  return private.create_task_record(
    'general', p_title, p_description, p_due_at, v_department, p_assignee_ids, p_team_id
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Plans
-- -----------------------------------------------------------------------------
-- The department a plan's work goes to: the assignee's or the team's.
create function private.pm_assignee_department(p_user uuid, p_team uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select department_id from public.profiles where id = p_user and is_active),
    (select department_id from public.teams where id = p_team and is_active)
  );
$$;

create function private.check_pm_plan(
  p_machine_id uuid,
  p_title text,
  p_interval_count integer,
  p_lead_days integer,
  p_assignee_user_id uuid,
  p_team_id uuid
)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_department uuid;
begin
  if not private.is_active_user() or not private.manages_maintenance() then
    raise exception 'خطط الصيانة الوقائية لمدير الصيانة' using errcode = '42501';
  end if;
  if not exists (select 1 from public.machines where id = p_machine_id and is_active and status <> 'retired') then
    raise exception 'الآلة غير موجودة أو خارج الخدمة' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) = 0 then
    raise exception 'اكتب عنوان الخطة' using errcode = 'P0001';
  end if;
  if p_interval_count is null or p_interval_count not between 1 and 365 then
    raise exception 'التكرار بين 1 و365' using errcode = 'P0001';
  end if;
  if coalesce(p_lead_days, 0) not between 0 and 60 then
    raise exception 'الإنشاء المسبق بين 0 و60 يوماً' using errcode = 'P0001';
  end if;
  if num_nonnulls(p_assignee_user_id, p_team_id) <> 1 then
    raise exception 'أسند الخطة إلى موظف أو إلى فريق (واحد منهما فقط)' using errcode = 'P0001';
  end if;

  v_department := private.pm_assignee_department(p_assignee_user_id, p_team_id);
  if v_department is null then
    raise exception 'الموظف أو الفريق غير موجود أو موقوف' using errcode = 'P0001';
  end if;
  if not private.manages_department(v_department) then
    raise exception 'المسند إليه من قسم لا تديره' using errcode = '42501';
  end if;
  return v_department;
end;
$$;

create function public.create_pm_plan(
  p_machine_id uuid,
  p_title text,
  p_instructions text,
  p_interval_unit public.interval_unit,
  p_interval_count integer,
  p_start_date date,
  p_lead_days integer default 0,
  p_assignee_user_id uuid default null,
  p_team_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_department uuid := private.check_pm_plan(
    p_machine_id, p_title, p_interval_count, p_lead_days, p_assignee_user_id, p_team_id
  );
  v_id uuid;
begin
  if p_start_date is null then
    raise exception 'اختر تاريخ البداية' using errcode = 'P0001';
  end if;
  insert into public.pm_plans (
    machine_id, department_id, title, instructions, interval_unit, interval_count,
    start_date, next_due_date, lead_days, assignee_user_id, assignee_team_id
  ) values (
    p_machine_id, v_department, btrim(p_title), nullif(btrim(p_instructions), ''), p_interval_unit,
    p_interval_count, p_start_date,
    public.pm_next_occurrence(p_start_date, p_interval_unit, p_interval_count, private.factory_today()),
    coalesce(p_lead_days, 0), p_assignee_user_id, p_team_id
  )
  returning id into v_id;
  return v_id;
end;
$$;

create function public.update_pm_plan(
  p_plan_id uuid,
  p_title text,
  p_instructions text,
  p_interval_unit public.interval_unit,
  p_interval_count integer,
  p_start_date date,
  p_lead_days integer default 0,
  p_assignee_user_id uuid default null,
  p_team_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.pm_plans;
  v_department uuid;
  v_next date;
begin
  select * into v_plan from public.pm_plans where id = p_plan_id for update;
  if not found then
    raise exception 'الخطة غير موجودة' using errcode = 'P0002';
  end if;
  if not private.manages_department(v_plan.department_id) then
    raise exception 'خطط الصيانة الوقائية لمدير الصيانة' using errcode = '42501';
  end if;
  v_department := private.check_pm_plan(
    v_plan.machine_id, p_title, p_interval_count, p_lead_days, p_assignee_user_id, p_team_id
  );

  -- A changed schedule restarts from its first occurrence not already created.
  v_next := v_plan.next_due_date;
  if p_start_date is distinct from v_plan.start_date
     or p_interval_unit is distinct from v_plan.interval_unit
     or p_interval_count is distinct from v_plan.interval_count then
    v_next := public.pm_next_occurrence(p_start_date, p_interval_unit, p_interval_count, private.factory_today());
    while exists (select 1 from public.tasks where pm_plan_id = p_plan_id and pm_due_date = v_next) loop
      v_next := public.pm_next_occurrence(p_start_date, p_interval_unit, p_interval_count, v_next + 1);
    end loop;
  end if;

  update public.pm_plans
     set department_id = v_department,
         title = btrim(p_title),
         instructions = nullif(btrim(p_instructions), ''),
         interval_unit = p_interval_unit,
         interval_count = p_interval_count,
         start_date = p_start_date,
         next_due_date = v_next,
         lead_days = coalesce(p_lead_days, 0),
         assignee_user_id = p_assignee_user_id,
         assignee_team_id = p_team_id
   where id = p_plan_id;
end;
$$;

create function public.set_pm_plan_active(p_plan_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_department uuid;
begin
  select department_id into v_department from public.pm_plans where id = p_plan_id;
  if v_department is null then
    raise exception 'الخطة غير موجودة' using errcode = 'P0002';
  end if;
  if not private.is_active_user() or not private.manages_maintenance() or not private.manages_department(v_department) then
    raise exception 'خطط الصيانة الوقائية لمدير الصيانة' using errcode = '42501';
  end if;
  update public.pm_plans set is_active = p_active where id = p_plan_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Generation
-- -----------------------------------------------------------------------------
create function private.generate_pm_tasks()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := private.factory_today();
  v_zone text := private.factory_timezone();
  r record;
  v_due date;
  v_following date;
  v_task uuid;
  v_created integer := 0;
begin
  for r in
    select p.*, m.name as machine_name
      from public.pm_plans p
      join public.machines m on m.id = p.machine_id
     where p.is_active
       and m.is_active
       and m.status <> 'retired'
       and p.next_due_date - p.lead_days <= v_today
     order by p.next_due_date
     for update of p skip locked
  loop
    -- Missed occurrences collapse into the latest one inside the window.
    v_due := r.next_due_date;
    loop
      v_following := public.pm_next_occurrence(r.start_date, r.interval_unit, r.interval_count, v_due + 1);
      exit when v_following - r.lead_days > v_today;
      v_due := v_following;
    end loop;

    if not exists (select 1 from public.tasks where pm_plan_id = r.id and pm_due_date = v_due) then
      begin
        v_task := private.create_task_record(
          'preventive',
          'صيانة وقائية: ' || r.title || ' — ' || r.machine_name,
          r.instructions,
          ((v_due + 1)::timestamp - interval '1 minute') at time zone v_zone,
          r.department_id,
          case when r.assignee_user_id is null then null else array[r.assignee_user_id] end,
          r.assignee_team_id
        );
        update public.tasks set pm_plan_id = r.id, pm_due_date = v_due where id = v_task;
        v_created := v_created + 1;
      exception when others then
        perform private.notify_maintenance_managers(
          'pm_failed',
          'تعذّر إنشاء صيانة وقائية: ' || r.title,
          sqlerrm,
          '/admin/maintenance/preventive'
        );
      end;
    end if;

    update public.pm_plans
       set next_due_date = public.pm_next_occurrence(r.start_date, r.interval_unit, r.interval_count, v_due + 1),
           last_generated_at = now()
     where id = r.id;
  end loop;
  return v_created;
end;
$$;

-- For trying the schedule on a test environment; refused in production.
create function public.run_pm_generation_now()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_active_user() or not private.manages_maintenance() then
    raise exception 'لمدير الصيانة فقط' using errcode = '42501';
  end if;
  if (select env from private.environment_marker where id) = 'prod' then
    raise exception 'التشغيل اليدوي غير متاح في بيئة الإنتاج' using errcode = 'P0001';
  end if;
  return private.generate_pm_tasks();
end;
$$;

select cron.schedule('green-o-preventive-maintenance', '5 * * * *', $$select private.generate_pm_tasks()$$);

-- -----------------------------------------------------------------------------
-- Privileges
-- -----------------------------------------------------------------------------
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;

grant execute on function
  public.pm_next_occurrence(date, public.interval_unit, integer, date),
  public.create_pm_plan(uuid, text, text, public.interval_unit, integer, date, integer, uuid, uuid),
  public.update_pm_plan(uuid, text, text, public.interval_unit, integer, date, integer, uuid, uuid),
  public.set_pm_plan_active(uuid, boolean),
  public.run_pm_generation_now(),
  public.create_task(text, text, timestamptz, uuid, uuid[], uuid)
to authenticated;
