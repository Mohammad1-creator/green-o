-- The developer role ("المبرمج"): everything the general manager can do,
-- plus what is otherwise reserved for the maintenance manager (assigning
-- repairs and rejecting fault reports). Like the general manager, the
-- developer belongs to no department and sees the whole factory.
-- Nothing can edit or delete the audit trail, the developer included.
--
-- Also: set_user_role(), used by the "الصلاحيات" page, where the general
-- manager or the developer changes anyone's role (never their own).

-- -----------------------------------------------------------------------------
-- Role helpers
-- -----------------------------------------------------------------------------
-- Factory-wide roles: no department, every department in scope.
create function private.is_top_role(p_role public.app_role)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_role in ('developer', 'general_manager'), false);
$$;

create or replace function private.is_gm()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_top_role(private.my_role());
$$;

create or replace function private.is_maintenance_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.my_role() in ('maintenance_manager', 'developer'), false);
$$;

alter table public.profiles drop constraint profiles_department_required;
alter table public.profiles add constraint profiles_department_required
  check (role in ('developer', 'general_manager') or department_id is not null);

-- -----------------------------------------------------------------------------
-- Accounts: the developer, like the general manager, has no department.
-- -----------------------------------------------------------------------------
create or replace function public.create_user_profile(
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
  v_department uuid := case when private.is_top_role(p_role) then null else p_department_id end;
begin
  if not private.is_active_user() or not private.can_manage_account(v_department, p_role) then
    raise exception 'ليست لديك صلاحية لإنشاء هذا الحساب' using errcode = '42501';
  end if;

  if v_department is null and not private.is_top_role(p_role) then
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

create or replace function public.update_user_profile(
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
  v_department uuid := case when private.is_top_role(p_role) then null else p_department_id end;
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

  if v_department is null and not private.is_top_role(p_role) then
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

-- -----------------------------------------------------------------------------
-- The permissions page: change one person's role (and department).
-- A department role needs a department; a factory-wide role has none.
-- Every change is in the audit trail (profiles is audited).
-- -----------------------------------------------------------------------------
create function public.set_user_role(
  p_user_id uuid,
  p_role public.app_role,
  p_department_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.profiles;
  v_department uuid;
begin
  if not private.is_active_user() or not private.is_gm() then
    raise exception 'تغيير الصلاحيات للمدير العام والمبرمج فقط' using errcode = '42501';
  end if;
  if p_role is null then
    raise exception 'اختر الدور' using errcode = 'P0001';
  end if;
  select * into v_old from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'المستخدم غير موجود' using errcode = 'P0002';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'لا يمكنك تغيير صلاحياتك بنفسك' using errcode = '42501';
  end if;

  v_department := case
    when private.is_top_role(p_role) then null
    else coalesce(p_department_id, v_old.department_id)
  end;
  if v_department is null and not private.is_top_role(p_role) then
    raise exception 'اختر القسم لهذا الدور' using errcode = 'P0001';
  end if;
  if v_department is not null
     and v_department is distinct from v_old.department_id
     and not exists (select 1 from public.departments where id = v_department and is_active) then
    raise exception 'القسم غير موجود أو موقوف' using errcode = 'P0001';
  end if;
  if p_role = v_old.role and v_department is not distinct from v_old.department_id then
    return;
  end if;

  update public.profiles set role = p_role, department_id = v_department where id = p_user_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Repairs: the developer may decide on fault reports too. Having no
-- department, their repair tasks go to the maintenance department.
-- -----------------------------------------------------------------------------
create function public.maintenance_department()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.department_id
    from public.profiles p
   where p.role = 'maintenance_manager' and p.is_active and private.is_active_user()
   order by p.created_at
   limit 1;
$$;

create or replace function public.assign_fault_repair(
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
  v_department uuid := coalesce(private.my_department(), public.maintenance_department());
  v_task uuid;
begin
  if not private.is_active_user() or not private.is_maintenance_manager() then
    raise exception 'إسناد الإصلاح لمدير الصيانة وحده' using errcode = '42501';
  end if;
  if v_department is null then
    raise exception 'لا يوجد قسم صيانة له مدير نشط' using errcode = 'P0001';
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

-- -----------------------------------------------------------------------------
-- Alerts meant for the general manager reach the developer too.
-- -----------------------------------------------------------------------------
create or replace function private.record_chain_check()
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
      select id from public.profiles where private.is_top_role(role) and is_active
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

create or replace function private.notify_general_managers(p_type text, p_title text, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gm uuid;
begin
  for v_gm in select id from public.profiles where private.is_top_role(role) and is_active loop
    perform private.notify(v_gm, p_type, p_title, p_body, '/admin/settings#backups');
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Privileges
-- -----------------------------------------------------------------------------
revoke all on function
  private.is_top_role(public.app_role),
  public.set_user_role(uuid, public.app_role, uuid),
  public.maintenance_department()
from public, anon;

grant execute on function
  private.is_top_role(public.app_role),
  public.set_user_role(uuid, public.app_role, uuid),
  public.maintenance_department()
to authenticated;
