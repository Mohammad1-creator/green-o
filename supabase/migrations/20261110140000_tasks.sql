-- Phases 3-4: teams, tasks and the task lifecycle.
--
-- Tasks are never written directly: every change goes through a function
-- below that checks who is acting, whether the move is allowed from the
-- current status, records an event, and notifies the people concerned.

-- -----------------------------------------------------------------------------
-- Teams (inside one department)
-- -----------------------------------------------------------------------------
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id),
  name text not null
    constraint teams_name_length check (char_length(btrim(name)) between 1 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create unique index teams_department_name_unique on public.teams (department_id, lower(btrim(name)));

create trigger teams_updated_at
  before update on public.teams
  for each row execute function private.set_updated_at();

create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index team_members_user_idx on public.team_members (user_id);

create function private.check_team_member()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
      from public.teams t
      join public.profiles p on p.department_id = t.department_id
     where t.id = new.team_id and p.id = new.user_id
  ) then
    raise exception 'عضو الفريق يجب أن يكون من قسم الفريق نفسه' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger team_members_same_department
  before insert or update on public.team_members
  for each row execute function private.check_team_member();

create function private.team_department(p_team uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select department_id from public.teams where id = p_team;
$$;

create function private.is_team_member(p_team uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members where team_id = p_team and user_id = (select auth.uid())
  );
$$;

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

grant select on public.teams to authenticated;
grant insert (department_id, name, is_active), update (name, is_active) on public.teams to authenticated;

create policy teams_read on public.teams
  for select to authenticated
  using (
    (select private.is_active_user())
    and (private.manages_department(department_id) or private.is_team_member(id))
  );

create policy teams_insert on public.teams
  for insert to authenticated
  with check ((select private.is_active_user()) and private.manages_department(department_id));

create policy teams_update on public.teams
  for update to authenticated
  using ((select private.is_active_user()) and private.manages_department(department_id))
  with check (private.manages_department(department_id));

grant select, insert, delete on public.team_members to authenticated;

create policy team_members_read on public.team_members
  for select to authenticated
  using (
    (select private.is_active_user())
    and (
      private.manages_department(private.team_department(team_id))
      or private.is_team_member(team_id)
    )
  );

create policy team_members_insert on public.team_members
  for insert to authenticated
  with check (
    (select private.is_active_user())
    and private.manages_department(private.team_department(team_id))
  );

create policy team_members_delete on public.team_members
  for delete to authenticated
  using (
    (select private.is_active_user())
    and private.manages_department(private.team_department(team_id))
  );

create trigger audit_teams
  after insert or update or delete on public.teams
  for each row execute function audit.log_change('id', 'updated_at');

create trigger audit_team_members
  after insert or delete on public.team_members
  for each row execute function audit.log_change('team_id,user_id');

-- -----------------------------------------------------------------------------
-- Tasks
-- -----------------------------------------------------------------------------
create type public.task_status as enum (
  'new',
  'received',
  'in_progress',
  'pending_approval',
  'completed',
  'needs_follow_up',
  'cancelled'
);

create type public.task_kind as enum ('general', 'repair', 'preventive');

create sequence public.task_number_seq;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  number bigint not null default nextval('public.task_number_seq'),
  kind public.task_kind not null default 'general',
  title text not null
    constraint tasks_title_length check (char_length(btrim(title)) between 1 and 200),
  description text
    constraint tasks_description_length check (description is null or char_length(description) <= 5000),
  department_id uuid not null references public.departments (id),
  status public.task_status not null default 'new',
  due_at timestamptz,
  assigned_team_id uuid references public.teams (id),
  created_by uuid references public.profiles (id),
  submitted_at timestamptz,
  completed_at timestamptz,
  approved_by uuid references public.profiles (id),
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index tasks_number_unique on public.tasks (number);
create index tasks_department_status_idx on public.tasks (department_id, status);
create index tasks_due_open_idx on public.tasks (due_at)
  where status in ('new', 'received', 'in_progress', 'needs_follow_up');

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function private.set_updated_at();

create table public.task_assignees (
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  seen_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

create index task_assignees_user_idx on public.task_assignees (user_id);

create table public.task_events (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.tasks (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  event text not null
    constraint task_events_event_known
    check (event in ('created', 'status', 'edited', 'reassigned', 'comment', 'attachment', 'reminder')),
  from_status public.task_status,
  to_status public.task_status,
  note text
    constraint task_events_note_length check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now()
);

create index task_events_task_idx on public.task_events (task_id, created_at);

-- Overdue: past its due time and not yet handed in. Exposed to the API as a
-- computed column (select=is_overdue), so lists and reports agree.
create function public.is_overdue(t public.tasks)
returns boolean
language sql
stable
set search_path = ''
as $$
  select t.due_at is not null
     and t.due_at < now()
     and t.status in ('new', 'received', 'in_progress', 'needs_follow_up');
$$;

-- -----------------------------------------------------------------------------
-- Task permission helpers
-- -----------------------------------------------------------------------------
create function private.is_task_assignee(p_task uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.task_assignees where task_id = p_task and user_id = (select auth.uid())
  );
$$;

create function private.can_manage_task(p_task uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user() and exists (
    select 1 from public.tasks t where t.id = p_task and private.manages_department(t.department_id)
  );
$$;

create function private.can_view_task(p_task uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user()
     and (private.is_task_assignee(p_task) or private.can_manage_task(p_task));
$$;

alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_events enable row level security;

grant select on public.tasks, public.task_assignees, public.task_events to authenticated;

create policy tasks_read on public.tasks
  for select to authenticated
  using (
    (select private.is_active_user())
    and (private.manages_department(department_id) or private.is_task_assignee(id))
  );

create policy task_assignees_read on public.task_assignees
  for select to authenticated
  using (private.can_view_task(task_id));

create policy task_events_read on public.task_events
  for select to authenticated
  using (private.can_view_task(task_id));

create trigger audit_tasks
  after insert or update or delete on public.tasks
  for each row execute function audit.log_change('id', 'updated_at');

create trigger audit_task_assignees
  after insert or delete on public.task_assignees
  for each row execute function audit.log_change('task_id,user_id');

-- -----------------------------------------------------------------------------
-- Internal helpers for the lifecycle functions
-- -----------------------------------------------------------------------------
create function private.my_name()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select full_name from public.profiles where id = (select auth.uid());
$$;

create function private.log_task_event(
  p_task uuid,
  p_event text,
  p_from public.task_status default null,
  p_to public.task_status default null,
  p_note text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.task_events (task_id, actor_id, event, from_status, to_status, note)
  values (p_task, auth.uid(), p_event, p_from, p_to, left(p_note, 2000));
$$;

create function private.notify_task_assignees(
  p_task uuid,
  p_type text,
  p_title text,
  p_body text default null,
  p_only uuid[] default null
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
    select a.user_id
      from public.task_assignees a
     where a.task_id = p_task
       and a.user_id is distinct from auth.uid()
       and (p_only is null or a.user_id = any (p_only))
  loop
    perform private.notify(r.user_id, p_type, p_title, p_body, '/m/tasks/' || p_task);
  end loop;
end;
$$;

-- The task's creator and the managers of its department (never the actor).
create function private.notify_task_managers(
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
        or (p.department_id = t.department_id and p.role in ('maintenance_manager', 'production_manager'))
     where t.id = p_task
       and p.is_active
       and p.id is distinct from auth.uid()
  loop
    perform private.notify(r.id, p_type, p_title, p_body, '/admin/tasks/' || p_task);
  end loop;
end;
$$;

-- The people a task goes to: the active members of a team, or a list of
-- individuals. All must be active and belong to the task's department.
create function private.resolve_assignees(
  p_department uuid,
  p_assignee_ids uuid[],
  p_team_id uuid
)
returns uuid[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_people uuid[];
  v_requested integer := coalesce(cardinality(p_assignee_ids), 0);
begin
  if (p_team_id is null) = (v_requested = 0) then
    raise exception 'أسند المهمة إلى موظف أو إلى فريق (واحد منهما فقط)' using errcode = 'P0001';
  end if;

  if p_team_id is not null then
    if not exists (
      select 1 from public.teams where id = p_team_id and department_id = p_department and is_active
    ) then
      raise exception 'الفريق غير موجود في قسم المهمة أو موقوف' using errcode = 'P0001';
    end if;
    select array_agg(m.user_id order by m.user_id)
      into v_people
      from public.team_members m
      join public.profiles p on p.id = m.user_id
     where m.team_id = p_team_id and p.is_active;
    if v_people is null then
      raise exception 'لا يوجد في الفريق أعضاء نشطون' using errcode = 'P0001';
    end if;
    return v_people;
  end if;

  select array_agg(distinct p.id)
    into v_people
    from public.profiles p
   where p.id = any (p_assignee_ids) and p.is_active and p.department_id = p_department;

  if coalesce(cardinality(v_people), 0) <> (select count(distinct x) from unnest(p_assignee_ids) as x) then
    raise exception 'أحد المختارين ليس من قسم المهمة أو حسابه موقوف' using errcode = 'P0001';
  end if;
  return v_people;
end;
$$;

-- Creates a task of any kind. Callers check permission first.
create function private.create_task_record(
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
  if p_due_at is not null and p_due_at < now() - interval '5 minutes' then
    raise exception 'موعد الاستحقاق مضى. اختر موعداً قادماً' using errcode = 'P0001';
  end if;

  v_people := private.resolve_assignees(p_department, p_assignee_ids, p_team_id);

  insert into public.tasks (kind, title, description, department_id, due_at, assigned_team_id, created_by)
  values (p_kind, v_title, nullif(btrim(p_description), ''), p_department, p_due_at, p_team_id, auth.uid())
  returning id into v_task;

  insert into public.task_assignees (task_id, user_id)
  select v_task, person from unnest(v_people) as person;

  perform private.log_task_event(v_task, 'created', null, 'new');
  perform private.notify_task_assignees(
    v_task,
    'task_assigned',
    'مهمة جديدة: ' || v_title,
    coalesce('من ' || private.my_name(), 'مهمة جديدة مسندة إليك')
  );
  return v_task;
end;
$$;

-- Locks the task and returns it, or fails when it does not exist.
create function private.lock_task(p_task uuid)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.tasks;
begin
  select * into v_task from public.tasks where id = p_task for update;
  if not found then
    raise exception 'المهمة غير موجودة' using errcode = 'P0002';
  end if;
  return v_task;
end;
$$;

-- -----------------------------------------------------------------------------
-- Manager functions
-- -----------------------------------------------------------------------------
create function public.create_task(
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
  return private.create_task_record(
    'general', p_title, p_description, p_due_at, v_department, p_assignee_ids, p_team_id
  );
end;
$$;

create function public.update_task(
  p_task_id uuid,
  p_title text,
  p_description text default null,
  p_due_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.tasks := private.lock_task(p_task_id);
  v_title text := btrim(coalesce(p_title, ''));
begin
  if not private.can_manage_task(p_task_id) then
    raise exception 'ليست لديك صلاحية لتعديل هذه المهمة' using errcode = '42501';
  end if;
  if v_task.status in ('completed', 'cancelled') then
    raise exception 'لا يمكن تعديل مهمة مكتملة أو ملغاة' using errcode = 'P0001';
  end if;
  if char_length(v_title) = 0 then
    raise exception 'اكتب عنوان المهمة' using errcode = 'P0001';
  end if;
  if p_due_at is not null and p_due_at is distinct from v_task.due_at
     and p_due_at < now() - interval '5 minutes' then
    raise exception 'موعد الاستحقاق مضى. اختر موعداً قادماً' using errcode = 'P0001';
  end if;

  update public.tasks
     set title = v_title,
         description = nullif(btrim(p_description), ''),
         due_at = p_due_at
   where id = p_task_id;
  perform private.log_task_event(p_task_id, 'edited');
end;
$$;

create function public.reassign_task(
  p_task_id uuid,
  p_assignee_ids uuid[] default null,
  p_team_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.tasks := private.lock_task(p_task_id);
  v_people uuid[];
  v_added uuid[];
begin
  if not private.can_manage_task(p_task_id) then
    raise exception 'ليست لديك صلاحية لإسناد هذه المهمة' using errcode = '42501';
  end if;
  if v_task.status not in ('new', 'received', 'in_progress', 'needs_follow_up') then
    raise exception 'لا يمكن تغيير الإسناد في هذه الحالة' using errcode = 'P0001';
  end if;

  v_people := private.resolve_assignees(v_task.department_id, p_assignee_ids, p_team_id);

  select array_agg(person)
    into v_added
    from unnest(v_people) as person
   where not exists (select 1 from public.task_assignees a where a.task_id = p_task_id and a.user_id = person);

  delete from public.task_assignees where task_id = p_task_id and not (user_id = any (v_people));
  insert into public.task_assignees (task_id, user_id)
  select p_task_id, person from unnest(v_added) as person;

  update public.tasks set assigned_team_id = p_team_id where id = p_task_id;
  perform private.log_task_event(p_task_id, 'reassigned');
  if v_added is not null then
    perform private.notify_task_assignees(
      p_task_id, 'task_assigned', 'مهمة جديدة: ' || v_task.title,
      coalesce('من ' || private.my_name(), null), v_added
    );
  end if;
end;
$$;

create function public.approve_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.tasks := private.lock_task(p_task_id);
begin
  if not private.can_manage_task(p_task_id) then
    raise exception 'الاعتماد لمدير القسم' using errcode = '42501';
  end if;
  if v_task.status <> 'pending_approval' then
    raise exception 'المهمة ليست بانتظار الاعتماد' using errcode = 'P0001';
  end if;

  update public.tasks
     set status = 'completed', completed_at = now(), approved_by = auth.uid()
   where id = p_task_id;
  perform private.log_task_event(p_task_id, 'status', v_task.status, 'completed');
  perform private.notify_task_assignees(p_task_id, 'task_approved', 'اعتُمدت المهمة: ' || v_task.title);
end;
$$;

create function public.return_task(p_task_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.tasks := private.lock_task(p_task_id);
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if not private.can_manage_task(p_task_id) then
    raise exception 'الإعادة لمدير القسم' using errcode = '42501';
  end if;
  if v_task.status <> 'pending_approval' then
    raise exception 'المهمة ليست بانتظار الاعتماد' using errcode = 'P0001';
  end if;
  if char_length(v_reason) < 3 then
    raise exception 'اكتب سبب الإعادة' using errcode = 'P0001';
  end if;

  update public.tasks set status = 'needs_follow_up', submitted_at = null where id = p_task_id;
  perform private.log_task_event(p_task_id, 'status', v_task.status, 'needs_follow_up', v_reason);
  perform private.notify_task_assignees(
    p_task_id, 'task_returned', 'أُعيدت المهمة للمتابعة: ' || v_task.title, v_reason
  );
end;
$$;

create function public.cancel_task(p_task_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.tasks := private.lock_task(p_task_id);
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if not private.can_manage_task(p_task_id) then
    raise exception 'الإلغاء لمدير القسم' using errcode = '42501';
  end if;
  if v_task.status in ('completed', 'cancelled') then
    raise exception 'المهمة منتهية بالفعل' using errcode = 'P0001';
  end if;
  if char_length(v_reason) < 3 then
    raise exception 'اكتب سبب الإلغاء' using errcode = 'P0001';
  end if;

  update public.tasks
     set status = 'cancelled', cancelled_at = now(), cancel_reason = v_reason
   where id = p_task_id;
  perform private.log_task_event(p_task_id, 'status', v_task.status, 'cancelled', v_reason);
  perform private.notify_task_assignees(p_task_id, 'task_cancelled', 'أُلغيت المهمة: ' || v_task.title, v_reason);
end;
$$;

-- -----------------------------------------------------------------------------
-- Assignee functions
-- -----------------------------------------------------------------------------
create function public.mark_task_seen(p_task_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.task_assignees
     set seen_at = now()
   where task_id = p_task_id and user_id = auth.uid() and seen_at is null
     and private.is_active_user();
$$;

create function private.require_assignee(p_task public.tasks)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_active_user() or not private.is_task_assignee(p_task.id) then
    raise exception 'هذه المهمة ليست مسندة إليك' using errcode = '42501';
  end if;
end;
$$;

create function public.acknowledge_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.tasks := private.lock_task(p_task_id);
begin
  perform private.require_assignee(v_task);
  if v_task.status not in ('new', 'received', 'in_progress', 'needs_follow_up') then
    raise exception 'لا يمكن استلام المهمة في هذه الحالة' using errcode = 'P0001';
  end if;

  update public.task_assignees
     set seen_at = coalesce(seen_at, now()), acknowledged_at = coalesce(acknowledged_at, now())
   where task_id = p_task_id and user_id = auth.uid();

  if v_task.status = 'new' then
    update public.tasks set status = 'received' where id = p_task_id;
    perform private.log_task_event(p_task_id, 'status', 'new', 'received');
  end if;
end;
$$;

create function public.start_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.tasks := private.lock_task(p_task_id);
begin
  perform private.require_assignee(v_task);
  if v_task.status not in ('new', 'received', 'needs_follow_up') then
    raise exception 'لا يمكن بدء المهمة في هذه الحالة' using errcode = 'P0001';
  end if;

  update public.task_assignees
     set seen_at = coalesce(seen_at, now()), acknowledged_at = coalesce(acknowledged_at, now())
   where task_id = p_task_id and user_id = auth.uid();
  update public.tasks set status = 'in_progress' where id = p_task_id;
  perform private.log_task_event(p_task_id, 'status', v_task.status, 'in_progress');
end;
$$;

create function public.submit_task(p_task_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.tasks := private.lock_task(p_task_id);
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  perform private.require_assignee(v_task);
  if v_task.status <> 'in_progress' then
    raise exception 'ابدأ تنفيذ المهمة أولاً' using errcode = 'P0001';
  end if;

  update public.tasks set status = 'pending_approval', submitted_at = now() where id = p_task_id;
  perform private.log_task_event(p_task_id, 'status', 'in_progress', 'pending_approval', v_note);
  perform private.notify_task_managers(
    p_task_id,
    'task_submitted',
    'مهمة بانتظار اعتمادك: ' || v_task.title,
    coalesce(private.my_name(), '') || coalesce(': ' || v_note, '')
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Privileges
-- -----------------------------------------------------------------------------
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;
revoke all on sequence public.task_number_seq from public, anon, authenticated;

grant execute on function
  private.team_department(uuid),
  private.is_team_member(uuid),
  private.is_task_assignee(uuid),
  private.can_manage_task(uuid),
  private.can_view_task(uuid)
to authenticated;

grant execute on function
  public.is_overdue(public.tasks),
  public.create_task(text, text, timestamptz, uuid, uuid[], uuid),
  public.update_task(uuid, text, text, timestamptz),
  public.reassign_task(uuid, uuid[], uuid),
  public.approve_task(uuid),
  public.return_task(uuid, text),
  public.cancel_task(uuid, text),
  public.mark_task_seen(uuid),
  public.acknowledge_task(uuid),
  public.start_task(uuid),
  public.submit_task(uuid, text)
to authenticated;
