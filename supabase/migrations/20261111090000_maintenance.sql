-- Phase 6: machines, fault reports and repairs.
--
-- Anyone may report a fault. Only the maintenance manager assigns the repair
-- (not even the general manager) or rejects the report. A repair is an
-- ordinary task of kind "repair", so it has the same two-step closing; when
-- it is approved the fault closes and the machine is back in service.

create type public.machine_status as enum ('operational', 'down', 'under_maintenance', 'retired');
create type public.fault_status as enum ('open', 'assigned', 'resolved', 'rejected');

-- -----------------------------------------------------------------------------
-- Machines
-- -----------------------------------------------------------------------------
create table public.machines (
  id uuid primary key default gen_random_uuid(),
  code text not null
    constraint machines_code_format check (char_length(btrim(code)) between 1 and 40),
  name text not null
    constraint machines_name_length check (char_length(btrim(name)) between 1 and 120),
  department_id uuid references public.departments (id),
  status public.machine_status not null default 'operational',
  manufacturer text constraint machines_manufacturer_length check (manufacturer is null or char_length(manufacturer) <= 120),
  model text constraint machines_model_length check (model is null or char_length(model) <= 120),
  serial_no text constraint machines_serial_length check (serial_no is null or char_length(serial_no) <= 120),
  installed_on date,
  notes text constraint machines_notes_length check (notes is null or char_length(notes) <= 2000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create unique index machines_code_unique on public.machines (lower(btrim(code)));

create trigger machines_updated_at
  before update on public.machines
  for each row execute function private.set_updated_at();

create function private.manages_maintenance()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_gm() or private.is_maintenance_manager();
$$;

alter table public.machines enable row level security;

grant select on public.machines to authenticated;
grant insert (code, name, department_id, status, manufacturer, model, serial_no, installed_on, notes, is_active),
      update (code, name, department_id, status, manufacturer, model, serial_no, installed_on, notes, is_active)
  on public.machines to authenticated;

-- Everyone needs the machine list to report a fault.
create policy machines_read on public.machines
  for select to authenticated
  using ((select private.is_active_user()));

create policy machines_insert on public.machines
  for insert to authenticated
  with check ((select private.manages_maintenance()));

create policy machines_update on public.machines
  for update to authenticated
  using ((select private.manages_maintenance()))
  with check ((select private.manages_maintenance()));

create trigger audit_machines
  after insert or update or delete on public.machines
  for each row execute function audit.log_change('id', 'updated_at');

-- -----------------------------------------------------------------------------
-- Fault reports
-- -----------------------------------------------------------------------------
create sequence public.fault_number_seq;

create table public.fault_reports (
  id uuid primary key default gen_random_uuid(),
  number bigint not null default nextval('public.fault_number_seq'),
  machine_id uuid not null references public.machines (id),
  reported_by uuid not null references public.profiles (id),
  reporter_department_id uuid references public.departments (id),
  description text not null
    constraint fault_reports_description_length check (char_length(btrim(description)) between 1 and 2000),
  machine_stopped boolean not null default false,
  status public.fault_status not null default 'open',
  rejection_reason text,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index fault_reports_number_unique on public.fault_reports (number);
create index fault_reports_machine_idx on public.fault_reports (machine_id, created_at desc);
create index fault_reports_status_idx on public.fault_reports (status);

create trigger fault_reports_updated_at
  before update on public.fault_reports
  for each row execute function private.set_updated_at();

alter table public.tasks add column fault_report_id uuid references public.fault_reports (id);
create index tasks_fault_report_idx on public.tasks (fault_report_id) where fault_report_id is not null;

-- Photos may belong to a fault report too.
alter table public.attachments add column fault_report_id uuid references public.fault_reports (id) on delete cascade;
alter table public.attachments drop constraint attachments_has_parent;
alter table public.attachments add constraint attachments_one_parent
  check ((task_id is not null) <> (fault_report_id is not null));
create index attachments_fault_idx on public.attachments (fault_report_id) where deleted_at is null;

-- Reporter, their department's manager, maintenance managers, the general
-- manager, and whoever is assigned the repair.
create function private.can_view_fault(p_fault uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user() and exists (
    select 1
      from public.fault_reports f
     where f.id = p_fault
       and (
         f.reported_by = (select auth.uid())
         or private.manages_maintenance()
         or private.manages_department(f.reporter_department_id)
         or exists (
           select 1
             from public.tasks t
             join public.task_assignees a on a.task_id = t.id
            where t.fault_report_id = f.id and a.user_id = (select auth.uid())
         )
       )
  );
$$;

alter table public.fault_reports enable row level security;
grant select on public.fault_reports to authenticated;

create policy fault_reports_read on public.fault_reports
  for select to authenticated
  using (private.can_view_fault(id));

create trigger audit_fault_reports
  after insert or update or delete on public.fault_reports
  for each row execute function audit.log_change('id', 'updated_at');

-- Photos of a fault follow access to the fault.
drop policy attachments_rows_read on public.attachments;
create policy attachments_rows_read on public.attachments
  for select to authenticated
  using (
    deleted_at is null
    and (
      (task_id is not null and private.can_view_task(task_id))
      or (fault_report_id is not null and private.can_view_fault(fault_report_id))
    )
  );

create or replace function private.attachment_access(p_name text, p_action text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_folders text[] := storage.foldername(p_name);
  v_owner uuid := private.try_uuid(v_folders[2]);
begin
  if v_owner is null or p_name like '%..%' then
    return false;
  end if;
  if v_folders[1] = 'tasks' then
    return case p_action
      when 'read' then private.can_view_task(v_owner)
      when 'upload' then private.can_view_task(v_owner) and exists (
        select 1 from public.tasks where id = v_owner and status not in ('completed', 'cancelled')
      )
      when 'delete' then private.can_manage_task(v_owner)
      else false
    end;
  end if;
  if v_folders[1] = 'faults' then
    return case p_action
      when 'read' then private.can_view_fault(v_owner)
      when 'upload' then exists (
        select 1 from public.fault_reports
         where id = v_owner and reported_by = (select auth.uid()) and status = 'open'
      )
      when 'delete' then private.manages_maintenance()
      else false
    end;
  end if;
  return false;
end;
$$;

-- -----------------------------------------------------------------------------
-- Reporting, assigning and rejecting
-- -----------------------------------------------------------------------------
create function private.notify_maintenance_managers(p_type text, p_title text, p_body text, p_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select id from public.profiles
     where role = 'maintenance_manager' and is_active and id is distinct from auth.uid()
  loop
    perform private.notify(r.id, p_type, p_title, p_body, p_url);
  end loop;
end;
$$;

create function public.report_fault(
  p_machine_id uuid,
  p_description text,
  p_machine_stopped boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_machine public.machines;
  v_id uuid;
  v_text text := btrim(coalesce(p_description, ''));
begin
  if not private.is_active_user() then
    raise exception 'ليست لديك صلاحية لهذا الإجراء' using errcode = '42501';
  end if;
  select * into v_machine from public.machines where id = p_machine_id for update;
  if not found or not v_machine.is_active or v_machine.status = 'retired' then
    raise exception 'الآلة غير موجودة أو خارج الخدمة' using errcode = 'P0001';
  end if;
  if char_length(v_text) = 0 then
    raise exception 'صف العطل' using errcode = 'P0001';
  end if;

  insert into public.fault_reports (machine_id, reported_by, reporter_department_id, description, machine_stopped)
  values (p_machine_id, auth.uid(), private.my_department(), left(v_text, 2000), coalesce(p_machine_stopped, false))
  returning id into v_id;

  if coalesce(p_machine_stopped, false) and v_machine.status = 'operational' then
    update public.machines set status = 'down' where id = p_machine_id;
  end if;

  perform private.notify_maintenance_managers(
    'fault_reported',
    case when p_machine_stopped then 'عطل أوقف الآلة: ' else 'بلاغ عطل جديد: ' end || v_machine.name,
    coalesce(private.my_name(), '') || ': ' || left(v_text, 200),
    '/admin/maintenance/faults/' || v_id
  );
  return v_id;
end;
$$;

create function private.lock_fault(p_fault uuid)
returns public.fault_reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fault public.fault_reports;
begin
  select * into v_fault from public.fault_reports where id = p_fault for update;
  if not found then
    raise exception 'البلاغ غير موجود' using errcode = 'P0002';
  end if;
  return v_fault;
end;
$$;

-- The maintenance manager turns a report into a repair task.
create function public.assign_fault_repair(
  p_fault_id uuid,
  p_title text default null,
  p_description text default null,
  p_due_at timestamptz default null,
  p_assignee_ids uuid[] default null,
  p_team_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fault public.fault_reports := private.lock_fault(p_fault_id);
  v_machine public.machines;
  v_department uuid := private.my_department();
  v_task uuid;
begin
  if not private.is_active_user() or not private.is_maintenance_manager() then
    raise exception 'إسناد الإصلاح لمدير الصيانة وحده' using errcode = '42501';
  end if;
  if v_fault.status <> 'open' then
    raise exception 'البلاغ ليس مفتوحاً' using errcode = 'P0001';
  end if;
  if p_due_at is not null and p_due_at < now() - interval '5 minutes' then
    raise exception 'موعد الاستحقاق مضى. اختر موعداً قادماً' using errcode = 'P0001';
  end if;
  select * into v_machine from public.machines where id = v_fault.machine_id;

  v_task := private.create_task_record(
    'repair',
    coalesce(nullif(btrim(p_title), ''), 'إصلاح: ' || v_machine.name),
    coalesce(nullif(btrim(p_description), ''), v_fault.description),
    p_due_at,
    v_department,
    p_assignee_ids,
    p_team_id
  );
  update public.tasks set fault_report_id = p_fault_id where id = v_task;
  update public.fault_reports set status = 'assigned' where id = p_fault_id;
  if v_machine.status = 'down' then
    update public.machines set status = 'under_maintenance' where id = v_machine.id;
  end if;
  return v_task;
end;
$$;

-- Brings a machine back into service once none of its faults keep it stopped.
create function private.release_machine(p_machine uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.machines m
     set status = 'operational'
   where m.id = p_machine
     and m.status in ('down', 'under_maintenance')
     and not exists (
       select 1 from public.fault_reports f
        where f.machine_id = m.id and f.machine_stopped and f.status in ('open', 'assigned')
     );
$$;

create function public.reject_fault(p_fault_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fault public.fault_reports := private.lock_fault(p_fault_id);
  v_reason text := btrim(coalesce(p_reason, ''));
  v_machine_name text;
begin
  if not private.is_active_user() or not private.is_maintenance_manager() then
    raise exception 'رفض البلاغات لمدير الصيانة وحده' using errcode = '42501';
  end if;
  if v_fault.status <> 'open' then
    raise exception 'البلاغ ليس مفتوحاً' using errcode = 'P0001';
  end if;
  if char_length(v_reason) < 3 then
    raise exception 'اكتب سبب الرفض' using errcode = 'P0001';
  end if;

  update public.fault_reports set status = 'rejected', rejection_reason = v_reason where id = p_fault_id;
  perform private.release_machine(v_fault.machine_id);
  select name into v_machine_name from public.machines where id = v_fault.machine_id;
  perform private.notify(
    v_fault.reported_by, 'fault_rejected', 'لم يُقبل بلاغ العطل: ' || v_machine_name, v_reason, '/m/faults'
  );
end;
$$;

-- When a repair task is approved the fault is resolved; when it is cancelled
-- the fault goes back to the maintenance manager.
create function private.on_repair_task_finished()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fault public.fault_reports;
  v_machine_name text;
  v_note text;
begin
  if new.fault_report_id is null or new.status = old.status then
    return null;
  end if;
  select * into v_fault from public.fault_reports where id = new.fault_report_id for update;
  select name into v_machine_name from public.machines where id = v_fault.machine_id;

  if new.status = 'completed' then
    select note into v_note from public.task_events
     where task_id = new.id and to_status = 'pending_approval'
     order by id desc limit 1;
    update public.fault_reports
       set status = 'resolved', resolved_at = now(), resolution_notes = v_note
     where id = v_fault.id;
    perform private.release_machine(v_fault.machine_id);
    perform private.notify(
      v_fault.reported_by, 'fault_resolved', 'تم إصلاح العطل: ' || v_machine_name,
      coalesce(v_note, 'اعتمد مدير الصيانة الإصلاح.'), '/m/faults'
    );
  elsif new.status = 'cancelled' and v_fault.status = 'assigned' then
    update public.fault_reports set status = 'open' where id = v_fault.id;
    perform private.notify_maintenance_managers(
      'fault_reopened', 'عاد البلاغ دون إصلاح: ' || v_machine_name,
      'أُلغيت مهمة الإصلاح، والبلاغ ينتظر إسناداً جديداً.', '/admin/maintenance/faults/' || v_fault.id
    );
  end if;
  return null;
end;
$$;

create trigger tasks_repair_finished
  after update of status on public.tasks
  for each row
  when (new.fault_report_id is not null)
  execute function private.on_repair_task_finished();

-- Photos attached to a report by the person who reported it.
create function public.register_fault_attachment(
  p_fault_id uuid,
  p_path text,
  p_mime_type text,
  p_size_bytes integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not exists (
    select 1 from public.fault_reports
     where id = p_fault_id and reported_by = auth.uid() and status = 'open'
  ) or not private.is_active_user() then
    raise exception 'إرفاق الصور لصاحب البلاغ ما دام مفتوحاً' using errcode = '42501';
  end if;
  if p_path not like 'faults/' || p_fault_id || '/%' or p_path like '%..%' then
    raise exception 'مسار الملف لا يخص هذا البلاغ' using errcode = 'P0001';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'attachments' and name = p_path) then
    raise exception 'لم يُرفع الملف' using errcode = 'P0001';
  end if;

  insert into public.attachments (storage_path, mime_type, size_bytes, uploaded_by, fault_report_id)
  values (p_path, p_mime_type, p_size_bytes, auth.uid(), p_fault_id)
  returning id into v_id;
  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Privileges
-- -----------------------------------------------------------------------------
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;
revoke all on sequence public.fault_number_seq from public, anon, authenticated;

grant execute on function
  private.manages_maintenance(),
  private.can_view_fault(uuid),
  private.attachment_access(text, text)
to authenticated;

grant execute on function
  public.report_fault(uuid, text, boolean),
  public.assign_fault_repair(uuid, text, text, timestamptz, uuid[], uuid),
  public.reject_fault(uuid, text),
  public.register_fault_attachment(uuid, text, text, integer)
to authenticated;
