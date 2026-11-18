-- Occupational health and safety: violation types, violations, objections.
begin;
select plan(36);

-- Fixtures: safety manager 1401 · supervisor 1402 · safety employee 1407 (ds)
-- production manager 1403 · workers 1404, 1405 (dp) · maintenance manager 1406 (dm)
insert into public.departments (id, name) values
  ('00000000-0000-4000-8000-0000000014d1', 'اختبار: السلامة'),
  ('00000000-0000-4000-8000-0000000014d2', 'اختبار: الإنتاج سلامة'),
  ('00000000-0000-4000-8000-0000000014d3', 'اختبار: الصيانة سلامة');

do $$
begin
  perform tests.create_user('00000000-0000-4000-8000-000000001401', 'hse_manager', '00000000-0000-4000-8000-0000000014d1');
  perform tests.create_user('00000000-0000-4000-8000-000000001402', 'hse_supervisor', '00000000-0000-4000-8000-0000000014d1');
  perform tests.create_user('00000000-0000-4000-8000-000000001403', 'production_manager', '00000000-0000-4000-8000-0000000014d2');
  perform tests.create_user('00000000-0000-4000-8000-000000001404', 'employee', '00000000-0000-4000-8000-0000000014d2');
  perform tests.create_user('00000000-0000-4000-8000-000000001405', 'employee', '00000000-0000-4000-8000-0000000014d2');
  perform tests.create_user('00000000-0000-4000-8000-000000001406', 'maintenance_manager', '00000000-0000-4000-8000-0000000014d3');
  perform tests.create_user('00000000-0000-4000-8000-000000001407', 'employee', '00000000-0000-4000-8000-0000000014d1');
end $$;

create table tests.s_ids (name text primary key, id uuid not null);
grant select on tests.s_ids to authenticated;

-- 1-4: violation types belong to the safety manager
select tests.authenticate_as('00000000-0000-4000-8000-000000001401');
select lives_ok(
  $$ insert into public.violation_types (name, severity, points) values ('اختبار: بلا خوذة', 'medium', 10),
                                                                      ('اختبار: تدخين', 'high', 25) $$,
  'the safety manager defines violation types'
);
reset role; select tests.clear_claims();
insert into tests.s_ids select 'helmet', id from public.violation_types where name = 'اختبار: بلا خوذة';
insert into tests.s_ids select 'smoking', id from public.violation_types where name = 'اختبار: تدخين';
select tests.authenticate_as('00000000-0000-4000-8000-000000001402');
select throws_ok(
  $$ insert into public.violation_types (name, points) values ('اختبار: نوع', 5) $$,
  '42501', null,
  'a supervisor cannot define violation types'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001403');
select throws_ok(
  $$ insert into public.violation_types (name, points) values ('اختبار: نوع', 5) $$,
  '42501', null,
  'another department''s manager cannot define violation types'
);
select is(
  (select count(*)::int from public.violation_types where name like 'اختبار: %'),
  2,
  'everyone can read the violation types'
);
reset role; select tests.clear_claims();

-- 5-10: who records violations
select tests.authenticate_as('00000000-0000-4000-8000-000000001402');
select lives_ok(
  $$ select public.record_violation('00000000-0000-4000-8000-000000001404',
       (select id from tests.s_ids where name = 'helmet'), 'اختبار: بلا خوذة عند المقص', now() - interval '1 hour', 'خط القص') $$,
  'a supervisor records a violation against a production worker'
);
select throws_ok(
  $$ select public.record_violation('00000000-0000-4000-8000-000000001402',
       (select id from tests.s_ids where name = 'helmet'), 'على نفسي') $$,
  '42501', 'لا تسجّل مخالفة على نفسك',
  'nobody records a violation against themselves'
);
select throws_ok(
  $$ select public.record_violation('00000000-0000-4000-8000-000000001405',
       (select id from tests.s_ids where name = 'helmet'), 'لاحقاً', now() + interval '1 day') $$,
  'P0001', 'وقت المخالفة في المستقبل',
  'a violation cannot be in the future'
);
select throws_ok(
  $$ select public.record_violation('00000000-0000-4000-8000-000000001405',
       (select id from tests.s_ids where name = 'helmet'), ' ') $$,
  'P0001', 'اكتب وصف المخالفة',
  'a violation needs a description'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001407');
select throws_ok(
  $$ select public.record_violation('00000000-0000-4000-8000-000000001404',
       (select id from tests.s_ids where name = 'helmet'), 'محاولة') $$,
  '42501', null,
  'a plain employee cannot record violations'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001403');
select throws_ok(
  $$ select public.record_violation('00000000-0000-4000-8000-000000001404',
       (select id from tests.s_ids where name = 'helmet'), 'محاولة') $$,
  '42501', null,
  'a production manager cannot record violations'
);
reset role; select tests.clear_claims();
insert into tests.s_ids select 'v1', id from public.violations where description = 'اختبار: بلا خوذة عند المقص';

-- 11-13: the record copies the type, and the right people are told
select is(
  (select row(points, severity::text, employee_department_id)::text from public.violations
    where id = (select id from tests.s_ids where name = 'v1')),
  row(10, 'medium', '00000000-0000-4000-8000-0000000014d2'::uuid)::text,
  'the violation keeps the type''s points and severity, and the employee''s department'
);
select is(
  (select count(*)::int from public.notifications
    where user_id = '00000000-0000-4000-8000-000000001404' and type = 'violation_recorded'),
  1,
  'the employee is notified'
);
select is(
  (select count(*)::int from public.notifications
    where user_id = '00000000-0000-4000-8000-000000001403' and type = 'violation_recorded'),
  1,
  'the employee''s department manager is notified'
);

-- 14-19: who sees it
select tests.authenticate_as('00000000-0000-4000-8000-000000001404');
select is((select count(*)::int from public.violations), 1, 'the employee sees their violation');
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001405');
select is((select count(*)::int from public.violations), 0, 'a colleague does not');
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001403');
select is((select count(*)::int from public.violations), 1, 'the employee''s department manager sees it');
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001406');
select is((select count(*)::int from public.violations), 0, 'another department''s manager does not');
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001402');
select is((select count(*)::int from public.violations), 1, 'the supervisor sees what they recorded');
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001401');
select is((select count(*)::int from public.violations), 1, 'the safety manager sees every violation');
reset role; select tests.clear_claims();

-- 20-24: the employee objects
select tests.authenticate_as('00000000-0000-4000-8000-000000001405');
select throws_ok(
  $$ select public.accept_violation((select id from tests.s_ids where name = 'v1')) $$,
  '42501', null,
  'only the employee answers their violation'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001404');
select throws_ok(
  $$ select public.object_violation((select id from tests.s_ids where name = 'v1'), ' ') $$,
  'P0001', 'اكتب سبب الاعتراض',
  'an objection needs a reason'
);
select lives_ok(
  $$ select public.object_violation((select id from tests.s_ids where name = 'v1'), 'كنت خارج منطقة الخطر') $$,
  'the employee objects with a reason'
);
select throws_ok(
  $$ select public.accept_violation((select id from tests.s_ids where name = 'v1')) $$,
  'P0001', 'تم الرد على هذه المخالفة',
  'an answer is given once'
);
select throws_ok(
  $$ update public.violations set status = 'cancelled' $$,
  '42501', null,
  'the employee cannot change a violation directly'
);
reset role; select tests.clear_claims();

-- 25-29: the safety manager decides
select is(
  (select count(*)::int from public.notifications
    where user_id in ('00000000-0000-4000-8000-000000001401', '00000000-0000-4000-8000-000000001402')
      and type = 'violation_objected'),
  2,
  'the safety manager and the supervisor hear about the objection'
);
select tests.authenticate_as('00000000-0000-4000-8000-000000001402');
select throws_ok(
  $$ select public.decide_violation_objection((select id from tests.s_ids where name = 'v1'), true, 'مقبول') $$,
  '42501', null,
  'a supervisor cannot decide objections'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001401');
select throws_ok(
  $$ select public.decide_violation_objection((select id from tests.s_ids where name = 'v1'), false, '') $$,
  'P0001', 'اكتب سبب القرار',
  'a decision needs a reason'
);
select lives_ok(
  $$ select public.decide_violation_objection((select id from tests.s_ids where name = 'v1'), false, 'الكاميرا تثبت المخالفة') $$,
  'the safety manager rejects the objection'
);
reset role; select tests.clear_claims();
select is(
  (select status::text from public.violations where id = (select id from tests.s_ids where name = 'v1')),
  'confirmed',
  'a rejected objection confirms the violation'
);

-- 30-32: accepting, cancelling, and the points
select tests.authenticate_as('00000000-0000-4000-8000-000000001401');
select public.record_violation('00000000-0000-4000-8000-000000001405',
  (select id from tests.s_ids where name = 'smoking'), 'اختبار: تدخين قرب المخزن');
reset role; select tests.clear_claims();
insert into tests.s_ids select 'v2', id from public.violations where description = 'اختبار: تدخين قرب المخزن';
select tests.authenticate_as('00000000-0000-4000-8000-000000001405');
select lives_ok(
  $$ select public.accept_violation((select id from tests.s_ids where name = 'v2')) $$,
  'the employee accepts a violation'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001401');
select lives_ok(
  $$ select public.cancel_violation((select id from tests.s_ids where name = 'v2'), 'سُجّلت على الشخص الخطأ') $$,
  'the safety manager cancels a violation with a reason'
);
-- A later change to the type leaves recorded violations alone.
update public.violation_types set points = 99 where id = (select id from tests.s_ids where name = 'helmet');
select results_eq(
  $$ select points::int, awarded::int, deducted::int, violations
       from public.report_points_by_person(current_date - 1, current_date + 1)
      where user_id in ('00000000-0000-4000-8000-000000001404', '00000000-0000-4000-8000-000000001405') $$,
  $$ values (-10, 0, 10, 1) $$,
  'standing violations deduct their points; cancelled ones do not'
);
reset role; select tests.clear_claims();

-- 33-34: the safety manager manages their supervisors
select tests.authenticate_as('00000000-0000-4000-8000-000000001401');
select ok(
  private.can_manage_account('00000000-0000-4000-8000-0000000014d1', 'hse_supervisor'),
  'the safety manager manages the supervisors of their department'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001403');
select ok(
  not private.can_manage_account('00000000-0000-4000-8000-0000000014d2', 'hse_supervisor'),
  'other department managers do not create supervisors'
);
reset role; select tests.clear_claims();

-- 35-36: everything is audited
select is(
  (select count(*)::int from audit.log
    where table_name = 'public.violations'
      and record_id = (select id::text from tests.s_ids where name = 'v1')),
  3,
  'recording, the objection and the decision are audited'
);
select ok(
  exists (select 1 from audit.log where table_name = 'public.violation_types'),
  'violation types are audited'
);

select * from finish();
rollback;
