-- Task points: after a task is completed, its department manager (or the
-- general manager) awards points to the people who worked on it, each
-- person their own amount. An award is never edited; a mistaken award is
-- voided with a reason. Employees do not see points; managers see the
-- points on the tasks they manage, and a ranking per period.

create table public.task_points (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id),
  user_id uuid not null references public.profiles (id),
  points integer not null
    constraint task_points_range check (points between 1 and 1000),
  note text
    constraint task_points_note_length check (note is null or char_length(note) <= 500),
  awarded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references public.profiles (id),
  void_reason text
    constraint task_points_void_reason_length check (void_reason is null or char_length(void_reason) <= 500),
  constraint task_points_void check ((voided_at is null) = (void_reason is null))
);

create index task_points_task_idx on public.task_points (task_id);
create index task_points_user_idx on public.task_points (user_id, created_at);
create index task_points_created_idx on public.task_points (created_at);

alter table public.task_points enable row level security;
grant select on public.task_points to authenticated;

-- Only the managers of the task's department (and the general manager).
create policy task_points_read on public.task_points
  for select to authenticated
  using (private.can_manage_task(task_id));

create trigger audit_task_points
  after insert or update or delete on public.task_points
  for each row execute function audit.log_change('id', '');

-- -----------------------------------------------------------------------------
-- Award points: one call per form, one amount per person.
-- -----------------------------------------------------------------------------
create function public.award_task_points(
  p_task_id uuid,
  p_user_ids uuid[],
  p_points integer[],
  p_note text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.tasks := private.lock_task(p_task_id);
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_count integer;
begin
  if not private.can_manage_task(p_task_id) then
    raise exception 'النقاط يمنحها مدير القسم' using errcode = '42501';
  end if;
  if v_task.status <> 'completed' then
    raise exception 'النقاط تُمنح بعد اكتمال المهمة' using errcode = 'P0001';
  end if;
  v_count := coalesce(cardinality(p_user_ids), 0);
  if v_count = 0 then
    raise exception 'اكتب نقاط موظف واحد على الأقل' using errcode = 'P0001';
  end if;
  if v_count <> coalesce(cardinality(p_points), 0) then
    raise exception 'بيانات النقاط غير متطابقة' using errcode = '22023';
  end if;
  if v_count > 100 then
    raise exception 'عدد كبير جداً' using errcode = '22023';
  end if;
  if (select count(distinct u) from unnest(p_user_ids) as u) <> v_count then
    raise exception 'الموظف مكرر' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_points) as p where p is null or p < 1 or p > 1000) then
    raise exception 'النقاط رقم صحيح من 1 إلى 1000' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from unnest(p_user_ids) as u
     where u is null
        or not exists (select 1 from public.task_assignees a where a.task_id = p_task_id and a.user_id = u)
  ) then
    raise exception 'النقاط فقط لمن أُسندت إليهم المهمة' using errcode = 'P0001';
  end if;
  if (select auth.uid()) = any (p_user_ids) then
    raise exception 'لا تمنح نقاطاً لنفسك' using errcode = '42501';
  end if;
  if char_length(v_note) > 500 then
    raise exception 'الملاحظة طويلة' using errcode = 'P0001';
  end if;

  insert into public.task_points (task_id, user_id, points, note, awarded_by)
  select p_task_id, a.user_id, a.points, v_note, auth.uid()
    from unnest(p_user_ids, p_points) as a (user_id, points);
  return v_count;
end;
$$;

create function public.void_task_points(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.task_points;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  select * into v_row from public.task_points where id = p_id for update;
  if not found then
    raise exception 'النقاط غير موجودة' using errcode = 'P0002';
  end if;
  if not private.can_manage_task(v_row.task_id) then
    raise exception 'الإلغاء لمدير القسم' using errcode = '42501';
  end if;
  if v_row.voided_at is not null then
    raise exception 'النقاط ملغاة مسبقاً' using errcode = 'P0001';
  end if;
  if char_length(v_reason) < 3 then
    raise exception 'اكتب سبب الإلغاء' using errcode = 'P0001';
  end if;
  if char_length(v_reason) > 500 then
    raise exception 'السبب طويل' using errcode = 'P0001';
  end if;

  update public.task_points
     set voided_at = now(), voided_by = auth.uid(), void_reason = v_reason
   where id = p_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Ranking: points awarded in the period, per person, under the caller's RLS.
-- The department filter is the person's department.
-- -----------------------------------------------------------------------------
create function public.report_points_by_person(p_from date, p_to date, p_department_id uuid default null)
returns table (
  user_id uuid,
  full_name text,
  department_name text,
  points bigint,
  tasks integer,
  awards integer
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
  select p.id,
         p.full_name,
         d.name,
         sum(tp.points)::bigint,
         count(distinct tp.task_id)::int,
         count(*)::int
    from public.task_points tp
    join public.profiles p on p.id = tp.user_id
    left join public.departments d on d.id = p.department_id
   where tp.voided_at is null
     and tp.created_at >= private.period_start(p_from)
     and tp.created_at < private.period_start(p_to + 1)
     and (p_department_id is null or p.department_id = p_department_id)
   group by p.id, p.full_name, d.name
   order by sum(tp.points) desc, p.full_name;
end;
$$;

revoke all on function
  public.award_task_points(uuid, uuid[], integer[], text),
  public.void_task_points(uuid, text),
  public.report_points_by_person(date, date, uuid)
from public, anon;

grant execute on function
  public.award_task_points(uuid, uuid[], integer[], text),
  public.void_task_points(uuid, text),
  public.report_points_by_person(date, date, uuid)
to authenticated;
