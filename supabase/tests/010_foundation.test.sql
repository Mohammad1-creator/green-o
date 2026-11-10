-- Phase 1: privileges, departments, users, settings and the audit log.
begin;
select plan(45);

-- Fixtures (as postgres) -------------------------------------------------------
insert into public.departments (id, name) values
  ('00000000-0000-4000-8000-0000000000d1', 'اختبار: الصيانة'),
  ('00000000-0000-4000-8000-0000000000d2', 'اختبار: الإنتاج'),
  ('00000000-0000-4000-8000-0000000000d3', 'اختبار: الجودة');

do $$
begin
  perform tests.create_user('00000000-0000-4000-8000-000000000001', 'general_manager', null);
  perform tests.create_user('00000000-0000-4000-8000-000000000002', 'maintenance_manager', '00000000-0000-4000-8000-0000000000d1');
  perform tests.create_user('00000000-0000-4000-8000-000000000003', 'production_manager', '00000000-0000-4000-8000-0000000000d2');
  perform tests.create_user('00000000-0000-4000-8000-000000000004', 'employee', '00000000-0000-4000-8000-0000000000d1');
  perform tests.create_user('00000000-0000-4000-8000-000000000005', 'employee', '00000000-0000-4000-8000-0000000000d2');
  perform tests.create_user('00000000-0000-4000-8000-000000000006', 'employee', '00000000-0000-4000-8000-0000000000d1', false);
  perform tests.create_auth_user('00000000-0000-4000-8000-000000000011');
  perform tests.create_auth_user('00000000-0000-4000-8000-000000000012');
  perform tests.create_auth_user('00000000-0000-4000-8000-000000000013');
end $$;

-- 1-4: database-wide guarantees --------------------------------------------------
select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity $$,
  'every public table has row level security'
);

select is_empty(
  $$ select table_name, privilege_type from information_schema.role_table_grants
      where grantee = 'anon' and table_schema = 'public' $$,
  'anon has no privileges on public tables'
);

select is_empty(
  $$ select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'private', 'audit')
        and has_function_privilege('anon', p.oid, 'execute')
        and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') $$,
  'anon cannot execute any application function'
);

select is_empty(
  $$ select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'private', 'audit') and p.prosecdef
        and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%') $$,
  'every SECURITY DEFINER function pins its search_path'
);

-- 5: private tables are out of reach -------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000004');
select throws_ok(
  $$ select * from private.environment_marker $$,
  '42501', null,
  'an employee cannot read the environment marker'
);

-- 6-10: departments --------------------------------------------------------------
select is((select count(*)::int from public.departments), 3, 'an employee reads all departments');

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000001');
select lives_ok(
  $$ insert into public.departments (name) values ('اختبار: المستودع') $$,
  'the general manager creates a department'
);

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000002');
select throws_ok(
  $$ insert into public.departments (name) values ('اختبار: قسم غير مسموح') $$,
  '42501', null,
  'a department manager cannot create a department'
);

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000004');
update public.departments set name = 'اسم مخترق' where id = '00000000-0000-4000-8000-0000000000d1';
reset role; select tests.clear_claims();
select is(
  (select name from public.departments where id = '00000000-0000-4000-8000-0000000000d1'),
  'اختبار: الصيانة',
  'an employee cannot rename a department'
);

select tests.authenticate_as('00000000-0000-4000-8000-000000000006');
select is((select count(*)::int from public.departments), 0, 'an inactive user reads nothing');

-- 11-12: profiles directory ------------------------------------------------------
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000004');
select ok((select count(*) from public.profiles) >= 6, 'an employee reads the names directory');
select throws_ok(
  $$ update public.profiles set full_name = 'اسم جديد' where id = '00000000-0000-4000-8000-000000000004' $$,
  '42501', null,
  'profiles cannot be edited directly'
);

-- 13-16: employee details are scoped -----------------------------------------------
select is((select count(*)::int from public.employee_details), 1, 'an employee sees only their own details');

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000002');
select is((select count(*)::int from public.employee_details), 3, 'the maintenance manager sees their department only');

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000003');
select is((select count(*)::int from public.employee_details), 2, 'the production manager sees their department only');

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000001');
select ok((select count(*) from public.employee_details) >= 6, 'the general manager sees everyone');

-- 17-23: creating accounts ------------------------------------------------------
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000002');
select lives_ok(
  $$ select public.create_user_profile('00000000-0000-4000-8000-000000000011', 'موظف صيانة جديد', 'employee',
       '00000000-0000-4000-8000-0000000000d1', '700001') $$,
  'a department manager creates an employee in their department'
);
select throws_ok(
  $$ select public.create_user_profile('00000000-0000-4000-8000-000000000012', 'موظف إنتاج', 'employee',
       '00000000-0000-4000-8000-0000000000d2', '700002') $$,
  '42501', null,
  'a department manager cannot create an employee in another department'
);
select throws_ok(
  $$ select public.create_user_profile('00000000-0000-4000-8000-000000000012', 'مدير', 'production_manager',
       '00000000-0000-4000-8000-0000000000d1', '700002') $$,
  '42501', null,
  'a department manager cannot create a manager'
);

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000004');
select throws_ok(
  $$ select public.create_user_profile('00000000-0000-4000-8000-000000000012', 'موظف', 'employee',
       '00000000-0000-4000-8000-0000000000d1', '700002') $$,
  '42501', null,
  'an employee cannot create accounts'
);

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000001');
select lives_ok(
  $$ select public.create_user_profile('00000000-0000-4000-8000-000000000012', 'مدير الجودة', 'maintenance_manager',
       '00000000-0000-4000-8000-0000000000d3', '700002') $$,
  'the general manager creates a manager'
);
select throws_ok(
  $$ select public.create_user_profile('00000000-0000-4000-8000-000000000013', 'بلا قسم', 'employee', null, '700003') $$,
  'P0001', 'يجب اختيار القسم',
  'an employee account needs a department'
);

reset role; select tests.clear_claims();
select is(
  (select actor_id from audit.log
    where table_name = 'public.profiles' and action = 'insert'
      and record_id = '00000000-0000-4000-8000-000000000011'),
  '00000000-0000-4000-8000-000000000002'::uuid,
  'the audit log records who created the account'
);

-- 24-28: editing accounts -----------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000002');
select throws_ok(
  $$ select public.update_user_profile('00000000-0000-4000-8000-000000000004', 'موظف', 'production_manager',
       '00000000-0000-4000-8000-0000000000d1', (select employee_no from public.employee_details where user_id = '00000000-0000-4000-8000-000000000004')) $$,
  '42501', null,
  'a department manager cannot promote an employee'
);
select throws_ok(
  $$ select public.update_user_profile('00000000-0000-4000-8000-000000000004', 'موظف', 'employee',
       '00000000-0000-4000-8000-0000000000d2', (select employee_no from public.employee_details where user_id = '00000000-0000-4000-8000-000000000004')) $$,
  '42501', null,
  'a department manager cannot move an employee to another department'
);
select lives_ok(
  $$ select public.update_user_profile('00000000-0000-4000-8000-000000000004', 'اسم معدل', 'employee',
       '00000000-0000-4000-8000-0000000000d1', (select employee_no from public.employee_details where user_id = '00000000-0000-4000-8000-000000000004')) $$,
  'a department manager edits their employee'
);

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000001');
select lives_ok(
  $$ select public.update_user_profile('00000000-0000-4000-8000-000000000005', 'موظف منقول', 'employee',
       '00000000-0000-4000-8000-0000000000d3', (select employee_no from public.employee_details where user_id = '00000000-0000-4000-8000-000000000005')) $$,
  'the general manager moves an employee to another department'
);
select throws_ok(
  $$ select public.update_user_profile('00000000-0000-4000-8000-000000000001', 'المدير', 'employee',
       '00000000-0000-4000-8000-0000000000d1', (select employee_no from public.employee_details where user_id = '00000000-0000-4000-8000-000000000001')) $$,
  '42501', null,
  'nobody changes their own role'
);

-- 29-32: activating and deactivating --------------------------------------------
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000002');
select lives_ok(
  $$ select public.set_user_active('00000000-0000-4000-8000-000000000004', false) $$,
  'a department manager deactivates their employee'
);

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000004');
select is((select count(*)::int from public.departments), 0, 'a deactivated user is blocked immediately');

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000002');
select throws_ok(
  $$ select public.set_user_active('00000000-0000-4000-8000-000000000005', false) $$,
  '42501', null,
  'a department manager cannot deactivate staff of another department'
);

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000001');
select throws_ok(
  $$ select public.set_user_active('00000000-0000-4000-8000-000000000001', false) $$,
  '42501', null,
  'nobody deactivates their own account'
);

-- 33-35: password resets ----------------------------------------------------------
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000002');
select lives_ok(
  $$ select public.authorize_password_reset('00000000-0000-4000-8000-000000000004') $$,
  'a department manager may reset their employee''s password'
);

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000003');
select throws_ok(
  $$ select public.authorize_password_reset('00000000-0000-4000-8000-000000000004') $$,
  '42501', null,
  'a manager cannot reset passwords in another department'
);

reset role; select tests.clear_claims();
select is(
  (select count(*)::int from audit.log
    where action = 'password_reset' and record_id = '00000000-0000-4000-8000-000000000004'),
  1,
  'password resets are recorded in the audit log'
);

-- 36-38: settings -----------------------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000001');
select throws_ok(
  $$ update public.app_settings set timezone = 'Mars/Base' $$,
  '22023', null,
  'an unknown time zone is rejected'
);
select lives_ok(
  $$ update public.app_settings set timezone = 'Asia/Baghdad', factory_name = 'مصنع الاختبار' $$,
  'the general manager changes the settings'
);

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000005');
update public.app_settings set factory_name = 'اسم مخترق';
reset role; select tests.clear_claims();
select is(
  (select factory_name from public.app_settings),
  'مصنع الاختبار',
  'an employee cannot change the settings'
);

-- 39-43: the audit log is append-only and chained ------------------------------------
select throws_ok($$ update audit.log set action = 'x' $$, '42501', null, 'audit rows cannot be updated');
select throws_ok($$ delete from audit.log $$, '42501', null, 'audit rows cannot be deleted');
select throws_ok($$ truncate audit.log $$, '42501', null, 'the audit log cannot be truncated');

select is_empty(
  $$ select l.id
       from audit.log l
       left join lateral (
         select p.hash from audit.log p where p.id < l.id order by p.id desc limit 1
       ) prev on true
      where l.prev_hash is distinct from prev.hash $$,
  'each audit row points at the hash of the row before it'
);

select is_empty(
  $$ select id from audit.log
      where hash <> audit.compute_hash(prev_hash, occurred_at, actor_id, action,
                                       table_name, record_id, old_data, new_data) $$,
  'every stored hash matches its row'
);

-- 44-45: guards ---------------------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000001');
select throws_ok(
  $$ update public.departments set is_active = false where id = '00000000-0000-4000-8000-0000000000d2' $$,
  'P0001', null,
  'a department with active staff cannot be deactivated'
);
select throws_ok(
  $$ select public.bootstrap_general_manager('00000000-0000-4000-8000-000000000013', 'مدير', '700009') $$,
  '42501', null,
  'only the service role can bootstrap the first general manager'
);

select * from finish();
rollback;
