-- The developer role and the permissions page (set_user_role).
begin;
select plan(20);

-- Fixtures: developer 1301 · GM 1302 · maintenance manager 1303 (d1)
-- technician 1304 (d1) · production manager 1305 (d2) · worker 1306 (d2)
insert into public.departments (id, name) values
  ('00000000-0000-4000-8000-0000000013d1', 'اختبار: الصيانة مبرمج'),
  ('00000000-0000-4000-8000-0000000013d2', 'اختبار: الإنتاج مبرمج');

do $$
begin
  perform tests.create_user('00000000-0000-4000-8000-000000001301', 'developer', null);
  perform tests.create_user('00000000-0000-4000-8000-000000001302', 'general_manager', null);
  perform tests.create_user('00000000-0000-4000-8000-000000001303', 'maintenance_manager', '00000000-0000-4000-8000-0000000013d1');
  perform tests.create_user('00000000-0000-4000-8000-000000001304', 'employee', '00000000-0000-4000-8000-0000000013d1');
  perform tests.create_user('00000000-0000-4000-8000-000000001305', 'production_manager', '00000000-0000-4000-8000-0000000013d2');
  perform tests.create_user('00000000-0000-4000-8000-000000001306', 'employee', '00000000-0000-4000-8000-0000000013d2');
end $$;
-- Make this the maintenance department repairs fall back to.
update public.profiles set created_at = '2000-01-01' where id = '00000000-0000-4000-8000-000000001303';

create table tests.dev_ids (name text primary key, id uuid not null);
grant select on tests.dev_ids to authenticated;
insert into public.machines (code, name, department_id)
values ('T13-M', 'اختبار مبرمج: آلة', '00000000-0000-4000-8000-0000000013d2');
insert into tests.dev_ids select 'machine', id from public.machines where code = 'T13-M';

-- 1-2: a developer has no department and works factory-wide
select is(
  (select department_id from public.profiles where id = '00000000-0000-4000-8000-000000001301'),
  null,
  'a developer account has no department'
);
select tests.authenticate_as('00000000-0000-4000-8000-000000001301');
select ok(private.is_gm(), 'the developer has the general manager''s permissions');

-- 3-4: they see every department's people and the audit trail
select ok(
  (select count(*) from public.employee_details
    where user_id in ('00000000-0000-4000-8000-000000001304', '00000000-0000-4000-8000-000000001306')) = 2,
  'the developer reads every department''s staff details'
);
select lives_ok($$ select * from public.audit_tables() $$, 'the developer opens the audit trail');

-- 5: but cannot edit it
select throws_ok(
  $$ update audit.log set action = 'x' $$,
  '42501', null,
  'the developer cannot edit the audit trail'
);
reset role; select tests.clear_claims();

-- 6-8: the developer, unlike the general manager, may assign repairs
select tests.authenticate_as('00000000-0000-4000-8000-000000001306');
select public.report_fault((select id from tests.dev_ids where name = 'machine'), 'اختبار مبرمج: صوت غريب');
reset role; select tests.clear_claims();
insert into tests.dev_ids select 'fault', id from public.fault_reports where description = 'اختبار مبرمج: صوت غريب';
select tests.authenticate_as('00000000-0000-4000-8000-000000001302');
select throws_ok(
  $$ select public.assign_fault_repair((select id from tests.dev_ids where name = 'fault'), null, null, null,
       array['00000000-0000-4000-8000-000000001304']::uuid[]) $$,
  '42501', null,
  'the general manager still cannot assign repairs'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001301');
select lives_ok(
  $$ select public.assign_fault_repair((select id from tests.dev_ids where name = 'fault'), null, null, null,
       array['00000000-0000-4000-8000-000000001304']::uuid[]) $$,
  'the developer assigns a repair'
);
reset role; select tests.clear_claims();
select is(
  (select department_id from public.tasks where fault_report_id = (select id from tests.dev_ids where name = 'fault')),
  '00000000-0000-4000-8000-0000000013d1'::uuid,
  'the developer''s repair task goes to the maintenance department'
);

-- 9-13: who may change roles
select tests.authenticate_as('00000000-0000-4000-8000-000000001303');
select throws_ok(
  $$ select public.set_user_role('00000000-0000-4000-8000-000000001304', 'maintenance_manager') $$,
  '42501', null,
  'a department manager cannot change roles'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001306');
select throws_ok(
  $$ select public.set_user_role('00000000-0000-4000-8000-000000001306', 'developer') $$,
  '42501', null,
  'an employee cannot promote themselves'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001302');
select throws_ok(
  $$ select public.set_user_role('00000000-0000-4000-8000-000000001302', 'developer') $$,
  '42501', 'لا يمكنك تغيير صلاحياتك بنفسك',
  'nobody changes their own role'
);
select lives_ok(
  $$ select public.set_user_role('00000000-0000-4000-8000-000000001306', 'developer') $$,
  'the general manager makes someone a developer'
);
reset role; select tests.clear_claims();
select is(
  (select row(role::text, department_id)::text from public.profiles where id = '00000000-0000-4000-8000-000000001306'),
  row('developer', null::uuid)::text,
  'a developer belongs to no department'
);

-- 14-17: the developer gives and takes away permissions
select tests.authenticate_as('00000000-0000-4000-8000-000000001301');
select throws_ok(
  $$ select public.set_user_role('00000000-0000-4000-8000-000000001306', 'employee') $$,
  'P0001', 'اختر القسم لهذا الدور',
  'a department role needs a department'
);
select lives_ok(
  $$ select public.set_user_role('00000000-0000-4000-8000-000000001306', 'employee', '00000000-0000-4000-8000-0000000013d2') $$,
  'the developer turns them back into an employee'
);
select lives_ok(
  $$ select public.set_user_role('00000000-0000-4000-8000-000000001304', 'maintenance_manager') $$,
  'the developer promotes a technician, keeping their department'
);
select lives_ok(
  $$ select public.set_user_role('00000000-0000-4000-8000-000000001302', 'employee', '00000000-0000-4000-8000-0000000013d2') $$,
  'the developer can demote the general manager'
);
reset role; select tests.clear_claims();

-- 18-19: the change takes effect at once
select tests.authenticate_as('00000000-0000-4000-8000-000000001302');
select ok(not private.is_gm(), 'a demoted general manager loses their permissions immediately');
select is(
  (select count(*)::int from public.employee_details
    where user_id = '00000000-0000-4000-8000-000000001304'),
  0,
  'and no longer sees other departments'
);
reset role; select tests.clear_claims();

-- 20: role changes are audited
select ok(
  (select count(*) from audit.log
    where table_name = 'public.profiles'
      and record_id = '00000000-0000-4000-8000-000000001306'
      and 'role' = any (changed_fields)) = 2,
  'every role change is in the audit trail'
);

select * from finish();
rollback;
