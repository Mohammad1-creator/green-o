-- Phase 10: report figures for the dashboards and exports.
--
-- Every report is a SECURITY INVOKER function, so it runs under the
-- caller's row level security: the general manager's figures cover the
-- whole factory, a department manager's only what they may see. A period
-- is whole days in the factory time zone, both ends included. The figures
-- are computed in the database because the API returns at most 1000 rows.

create function private.period_start(p_day date)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select (p_day::timestamp) at time zone private.factory_timezone();
$$;

create function private.check_period(p_from date, p_to date)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'الفترة غير صحيحة' using errcode = 'P0001';
  end if;
  if p_to - p_from > 366 then
    raise exception 'الفترة أطول من سنة' using errcode = 'P0001';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Tasks: those created in the period
-- -----------------------------------------------------------------------------
create function public.report_task_summary(p_from date, p_to date, p_department_id uuid default null)
returns table (
  total integer,
  open integer,
  pending_approval integer,
  completed integer,
  cancelled integer,
  overdue integer,
  completed_on_time integer,
  returned integer,
  avg_completion_hours numeric
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
  with scope as (
    select t.id, t.status, t.due_at, t.submitted_at, t.created_at, t.completed_at
      from public.tasks t
     where t.created_at >= private.period_start(p_from)
       and t.created_at < private.period_start(p_to + 1)
       and (p_department_id is null or t.department_id = p_department_id)
  )
  select
    count(*)::int,
    (count(*) filter (where s.status in ('new', 'received', 'in_progress', 'needs_follow_up')))::int,
    (count(*) filter (where s.status = 'pending_approval'))::int,
    (count(*) filter (where s.status = 'completed'))::int,
    (count(*) filter (where s.status = 'cancelled'))::int,
    (count(*) filter (where s.due_at < now()
                        and s.status in ('new', 'received', 'in_progress', 'needs_follow_up')))::int,
    (count(*) filter (where s.status = 'completed'
                        and (s.due_at is null or s.submitted_at <= s.due_at)))::int,
    (select count(*) from public.task_events e
      where e.to_status = 'needs_follow_up' and e.task_id in (select scope.id from scope))::int,
    round((avg(extract(epoch from s.completed_at - s.created_at))
             filter (where s.status = 'completed') / 3600)::numeric, 1)
  from scope s;
end;
$$;

create function public.report_tasks_by_department(p_from date, p_to date)
returns table (
  department_id uuid,
  department_name text,
  total integer,
  completed integer,
  completed_on_time integer,
  overdue integer,
  avg_completion_hours numeric
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
  select
    d.id,
    d.name,
    count(*)::int,
    (count(*) filter (where t.status = 'completed'))::int,
    (count(*) filter (where t.status = 'completed'
                        and (t.due_at is null or t.submitted_at <= t.due_at)))::int,
    (count(*) filter (where t.due_at < now()
                        and t.status in ('new', 'received', 'in_progress', 'needs_follow_up')))::int,
    round((avg(extract(epoch from t.completed_at - t.created_at))
             filter (where t.status = 'completed') / 3600)::numeric, 1)
  from public.tasks t
  join public.departments d on d.id = t.department_id
  where t.created_at >= private.period_start(p_from)
    and t.created_at < private.period_start(p_to + 1)
  group by d.id, d.name
  order by count(*) desc, d.name;
end;
$$;

create function public.report_tasks_by_person(p_from date, p_to date, p_department_id uuid default null)
returns table (
  user_id uuid,
  full_name text,
  department_name text,
  assigned integer,
  completed integer,
  completed_on_time integer,
  overdue integer,
  returned integer
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
  with scope as (
    select t.id, t.status, t.due_at, t.submitted_at
      from public.tasks t
     where t.created_at >= private.period_start(p_from)
       and t.created_at < private.period_start(p_to + 1)
       and (p_department_id is null or t.department_id = p_department_id)
  ),
  returned_tasks as (
    select e.task_id, count(*) as times
      from public.task_events e
     where e.to_status = 'needs_follow_up' and e.task_id in (select scope.id from scope)
     group by e.task_id
  )
  select
    p.id,
    p.full_name,
    d.name,
    count(*)::int,
    (count(*) filter (where s.status = 'completed'))::int,
    (count(*) filter (where s.status = 'completed'
                        and (s.due_at is null or s.submitted_at <= s.due_at)))::int,
    (count(*) filter (where s.due_at < now()
                        and s.status in ('new', 'received', 'in_progress', 'needs_follow_up')))::int,
    coalesce(sum(r.times), 0)::int
  from scope s
  join public.task_assignees a on a.task_id = s.id
  join public.profiles p on p.id = a.user_id
  left join public.departments d on d.id = p.department_id
  left join returned_tasks r on r.task_id = s.id
  group by p.id, p.full_name, d.name
  order by count(*) desc, p.full_name;
end;
$$;

create function public.report_tasks_by_team(p_from date, p_to date, p_department_id uuid default null)
returns table (
  team_id uuid,
  team_name text,
  department_name text,
  total integer,
  completed integer,
  completed_on_time integer,
  overdue integer
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
  select
    tm.id,
    tm.name,
    d.name,
    count(*)::int,
    (count(*) filter (where t.status = 'completed'))::int,
    (count(*) filter (where t.status = 'completed'
                        and (t.due_at is null or t.submitted_at <= t.due_at)))::int,
    (count(*) filter (where t.due_at < now()
                        and t.status in ('new', 'received', 'in_progress', 'needs_follow_up')))::int
  from public.tasks t
  join public.teams tm on tm.id = t.assigned_team_id
  join public.departments d on d.id = tm.department_id
  where t.created_at >= private.period_start(p_from)
    and t.created_at < private.period_start(p_to + 1)
    and (p_department_id is null or t.department_id = p_department_id)
  group by tm.id, tm.name, d.name
  order by count(*) desc, tm.name;
end;
$$;

-- -----------------------------------------------------------------------------
-- Maintenance: faults reported in the period
-- -----------------------------------------------------------------------------
-- Response: from the report to the repair task. Repair: from the report to
-- the approved repair. Downtime: from the report to the repair (or until
-- now) for faults that stopped the machine; rejected reports are left out.
create function public.report_maintenance_summary(p_from date, p_to date)
returns table (
  reported integer,
  open_now integer,
  resolved integer,
  rejected integer,
  avg_response_hours numeric,
  avg_repair_hours numeric,
  downtime_hours numeric
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
  with scope as (
    select f.id, f.status, f.machine_stopped, f.created_at, f.resolved_at
      from public.fault_reports f
     where f.created_at >= private.period_start(p_from)
       and f.created_at < private.period_start(p_to + 1)
  ),
  response as (
    select s.id, min(t.created_at) - s.created_at as wait
      from scope s
      join public.tasks t on t.fault_report_id = s.id
     group by s.id, s.created_at
  )
  select
    count(*)::int,
    (select count(*) from public.fault_reports f where f.status in ('open', 'assigned'))::int,
    (count(*) filter (where s.status = 'resolved'))::int,
    (count(*) filter (where s.status = 'rejected'))::int,
    (select round((avg(extract(epoch from r.wait)) / 3600)::numeric, 1) from response r),
    round((avg(extract(epoch from s.resolved_at - s.created_at))
             filter (where s.status = 'resolved') / 3600)::numeric, 1),
    round((coalesce(sum(extract(epoch from coalesce(s.resolved_at, now()) - s.created_at))
             filter (where s.machine_stopped and s.status <> 'rejected'), 0) / 3600)::numeric, 1)
  from scope s;
end;
$$;

create function public.report_faults_by_machine(p_from date, p_to date)
returns table (
  machine_id uuid,
  code text,
  name text,
  faults integer,
  stopped integer,
  downtime_hours numeric,
  avg_repair_hours numeric
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
  select
    m.id,
    m.code,
    m.name,
    count(*)::int,
    (count(*) filter (where f.machine_stopped))::int,
    round((coalesce(sum(extract(epoch from coalesce(f.resolved_at, now()) - f.created_at))
             filter (where f.machine_stopped and f.status <> 'rejected'), 0) / 3600)::numeric, 1),
    round((avg(extract(epoch from f.resolved_at - f.created_at))
             filter (where f.status = 'resolved') / 3600)::numeric, 1)
  from public.fault_reports f
  join public.machines m on m.id = f.machine_id
  where f.created_at >= private.period_start(p_from)
    and f.created_at < private.period_start(p_to + 1)
  group by m.id, m.code, m.name
  order by count(*) desc, m.code
  limit 100;
end;
$$;

-- Preventive tasks due in the period, up to yesterday. On time = handed in
-- before the end of its due day and approved. Cancelled ones are counted
-- apart and left out of "due".
create function public.report_pm_compliance(p_from date, p_to date)
returns table (
  due integer,
  on_time integer,
  late integer,
  missed integer,
  cancelled integer
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
  with scope as (
    select t.status, t.due_at, t.submitted_at
      from public.tasks t
     where t.kind = 'preventive'
       and t.pm_due_date between p_from and least(p_to, private.factory_today() - 1)
  )
  select
    (count(*) filter (where s.status <> 'cancelled'))::int,
    (count(*) filter (where s.status = 'completed'
                        and (s.due_at is null or s.submitted_at <= s.due_at)))::int,
    (count(*) filter (where s.status = 'completed' and s.submitted_at > s.due_at))::int,
    (count(*) filter (where s.status not in ('completed', 'cancelled')))::int,
    (count(*) filter (where s.status = 'cancelled'))::int
  from scope s;
end;
$$;

-- -----------------------------------------------------------------------------
-- Production: entries recorded in the period (voided ones left out)
-- -----------------------------------------------------------------------------
create function public.report_production_summary(p_from date, p_to date)
returns table (
  orders_running integer,
  orders_completed integer,
  orders_late integer,
  good_qty numeric,
  defect_qty numeric
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
  select
    (select count(*) from public.production_orders o where o.status in ('open', 'in_progress'))::int,
    (select count(*) from public.production_orders o
      where o.status = 'completed'
        and o.completed_at >= private.period_start(p_from)
        and o.completed_at < private.period_start(p_to + 1))::int,
    (select count(*) from public.production_orders o
      where o.status in ('open', 'in_progress') and o.due_date < private.factory_today())::int,
    coalesce(sum(e.good_qty), 0)::numeric,
    coalesce(sum(e.defect_qty), 0)::numeric
  from public.stage_entries e
  where e.voided_at is null
    and e.created_at >= private.period_start(p_from)
    and e.created_at < private.period_start(p_to + 1);
end;
$$;

-- Per stage: what was recorded in the period, and what is waiting now.
create function public.report_production_by_stage(p_from date, p_to date)
returns table (
  stage_id uuid,
  stage_name text,
  good_qty numeric,
  defect_qty numeric,
  waiting_qty numeric
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
  with recorded as (
    select os.stage_id, sum(e.good_qty) as good, sum(e.defect_qty) as defect
      from public.stage_entries e
      join public.order_stages os on os.id = e.order_stage_id
     where e.voided_at is null
       and e.created_at >= private.period_start(p_from)
       and e.created_at < private.period_start(p_to + 1)
     group by os.stage_id
  ),
  waiting as (
    select os.stage_id, sum(public.available_qty(os)) as qty
      from public.order_stages os
      join public.production_orders o on o.id = os.order_id
     where o.status in ('open', 'in_progress') and os.status <> 'closed'
     group by os.stage_id
  )
  select
    st.id,
    st.name,
    coalesce(r.good, 0)::numeric,
    coalesce(r.defect, 0)::numeric,
    coalesce(w.qty, 0)::numeric
  from public.stages st
  left join recorded r on r.stage_id = st.id
  left join waiting w on w.stage_id = st.id
  where r.stage_id is not null or w.stage_id is not null
  order by st.sort_order, st.name;
end;
$$;

-- Per product: finished (good at each order's last stage) and defective.
create function public.report_production_by_product(p_from date, p_to date)
returns table (
  product_id uuid,
  code text,
  name text,
  unit text,
  finished_qty numeric,
  defect_qty numeric
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
  with last_stage as (
    select os.order_id, max(os.seq) as seq from public.order_stages os group by os.order_id
  )
  select
    p.id,
    p.code,
    p.name,
    p.unit,
    coalesce(sum(e.good_qty) filter (where os.seq = ls.seq), 0)::numeric,
    coalesce(sum(e.defect_qty), 0)::numeric
  from public.stage_entries e
  join public.order_stages os on os.id = e.order_stage_id
  join last_stage ls on ls.order_id = os.order_id
  join public.production_orders o on o.id = os.order_id
  join public.products p on p.id = o.product_id
  where e.voided_at is null
    and e.created_at >= private.period_start(p_from)
    and e.created_at < private.period_start(p_to + 1)
  group by p.id, p.code, p.name, p.unit
  order by 5 desc, p.code;
end;
$$;

create function public.report_production_by_worker(p_from date, p_to date)
returns table (
  worker_id uuid,
  full_name text,
  entries integer,
  good_qty numeric,
  defect_qty numeric
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
  select
    pr.id,
    pr.full_name,
    count(*)::int,
    sum(e.good_qty)::numeric,
    sum(e.defect_qty)::numeric
  from public.stage_entries e
  join public.profiles pr on pr.id = e.worker_id
  where e.voided_at is null
    and e.created_at >= private.period_start(p_from)
    and e.created_at < private.period_start(p_to + 1)
  group by pr.id, pr.full_name
  order by 4 desc, pr.full_name;
end;
$$;

create function public.report_defects_by_type(p_from date, p_to date)
returns table (
  defect_type_id uuid,
  name text,
  stage_name text,
  entries integer,
  defect_qty numeric
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
  select
    dt.id,
    dt.name,
    st.name,
    count(*)::int,
    sum(e.defect_qty)::numeric
  from public.stage_entries e
  join public.defect_types dt on dt.id = e.defect_type_id
  left join public.stages st on st.id = dt.stage_id
  where e.voided_at is null
    and e.defect_qty > 0
    and e.created_at >= private.period_start(p_from)
    and e.created_at < private.period_start(p_to + 1)
  group by dt.id, dt.name, st.name
  order by 5 desc, dt.name;
end;
$$;

-- -----------------------------------------------------------------------------
-- Privileges
-- -----------------------------------------------------------------------------
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;

grant execute on function
  private.period_start(date),
  private.check_period(date, date)
to authenticated;

grant execute on function
  public.report_task_summary(date, date, uuid),
  public.report_tasks_by_department(date, date),
  public.report_tasks_by_person(date, date, uuid),
  public.report_tasks_by_team(date, date, uuid),
  public.report_maintenance_summary(date, date),
  public.report_faults_by_machine(date, date),
  public.report_pm_compliance(date, date),
  public.report_production_summary(date, date),
  public.report_production_by_stage(date, date),
  public.report_production_by_product(date, date),
  public.report_production_by_worker(date, date),
  public.report_defects_by_type(date, date)
to authenticated;
