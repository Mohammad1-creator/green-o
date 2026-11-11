-- Task points: awarded after completion by the task's managers, per person.
begin;
select plan(26);

-- Fixtures: GM 1201 · production manager 1202 (d2) · maintenance manager 1203 (d1)
-- workers 1204, 1205 (d2, assigned) · worker 1206 (d2, not assigned)
insert into public.departments (id, name) values
  ('00000000-0000-4000-8000-0000000012d1', 'اختبار: الصيانة نقاط'),
  ('00000000-0000-4000-8000-0000000012d2', 'اختبار: الإنتاج نقاط');

do $$
begin
  perform tests.create_user('00000000-0000-4000-8000-000000001201', 'general_manager', null);
  perform tests.create_user('00000000-0000-4000-8000-000000001202', 'production_manager', '00000000-0000-4000-8000-0000000012d2');
  perform tests.create_user('00000000-0000-4000-8000-000000001203', 'maintenance_manager', '00000000-0000-4000-8000-0000000012d1');
  perform tests.create_user('00000000-0000-4000-8000-000000001204', 'employee', '00000000-0000-4000-8000-0000000012d2');
  perform tests.create_user('00000000-0000-4000-8000-000000001205', 'employee', '00000000-0000-4000-8000-0000000012d2');
  perform tests.create_user('00000000-0000-4000-8000-000000001206', 'employee', '00000000-0000-4000-8000-0000000012d2');
end $$;

create table tests.p_ids (name text primary key, id uuid not null);
grant select on tests.p_ids to authenticated;

-- A team task for 1204 and 1205, and a task the production manager works on.
select tests.authenticate_as('00000000-0000-4000-8000-000000001202');
select public.create_task('اختبار نقاط: مهمة', null, null, null,
  array['00000000-0000-4000-8000-000000001204', '00000000-0000-4000-8000-000000001205']::uuid[]);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001201');
select public.create_task('اختبار نقاط: مهمة المدير', null, null,
  '00000000-0000-4000-8000-0000000012d2',
  array['00000000-0000-4000-8000-000000001202', '00000000-0000-4000-8000-000000001204']::uuid[]);
reset role; select tests.clear_claims();
insert into tests.p_ids select 'done', id from public.tasks where title = 'اختبار نقاط: مهمة';
insert into tests.p_ids select 'self', id from public.tasks where title = 'اختبار نقاط: مهمة المدير';

-- 1: no points before the task is completed
select tests.authenticate_as('00000000-0000-4000-8000-000000001202');
select throws_ok(
  $$ select public.award_task_points((select id from tests.p_ids where name = 'done'),
       array['00000000-0000-4000-8000-000000001204']::uuid[], array[5]) $$,
  'P0001', 'النقاط تُمنح بعد اكتمال المهمة',
  'points wait for the task to be completed'
);
reset role; select tests.clear_claims();

-- Complete both tasks.
select tests.authenticate_as('00000000-0000-4000-8000-000000001204');
select public.start_task((select id from tests.p_ids where name = 'done'));
select public.submit_task((select id from tests.p_ids where name = 'done'));
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001202');
select public.approve_task((select id from tests.p_ids where name = 'done'));
select public.start_task((select id from tests.p_ids where name = 'self'));
select public.submit_task((select id from tests.p_ids where name = 'self'));
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001201');
select public.approve_task((select id from tests.p_ids where name = 'self'));
reset role; select tests.clear_claims();

-- 2-3: only the task's managers award points
select tests.authenticate_as('00000000-0000-4000-8000-000000001204');
select throws_ok(
  $$ select public.award_task_points((select id from tests.p_ids where name = 'done'),
       array['00000000-0000-4000-8000-000000001205']::uuid[], array[5]) $$,
  '42501', null,
  'an employee cannot award points'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001203');
select throws_ok(
  $$ select public.award_task_points((select id from tests.p_ids where name = 'done'),
       array['00000000-0000-4000-8000-000000001204']::uuid[], array[5]) $$,
  '42501', null,
  'another department''s manager cannot award points'
);
reset role; select tests.clear_claims();

-- 4-10: the department manager awards each person their own amount
select tests.authenticate_as('00000000-0000-4000-8000-000000001202');
select is(
  public.award_task_points((select id from tests.p_ids where name = 'done'),
    array['00000000-0000-4000-8000-000000001204', '00000000-0000-4000-8000-000000001205']::uuid[],
    array[10, 5], 'عمل ممتاز'),
  2,
  'the manager awards points to two people'
);
select throws_ok(
  $$ select public.award_task_points((select id from tests.p_ids where name = 'done'),
       array['00000000-0000-4000-8000-000000001206']::uuid[], array[5]) $$,
  'P0001', 'النقاط فقط لمن أُسندت إليهم المهمة',
  'points go only to the task''s assignees'
);
select throws_ok(
  $$ select public.award_task_points((select id from tests.p_ids where name = 'done'),
       array['00000000-0000-4000-8000-000000001204']::uuid[], array[0]) $$,
  'P0001', 'النقاط رقم صحيح من 1 إلى 1000',
  'zero points are refused'
);
select throws_ok(
  $$ select public.award_task_points((select id from tests.p_ids where name = 'done'),
       array['00000000-0000-4000-8000-000000001204']::uuid[], array[1001]) $$,
  'P0001', 'النقاط رقم صحيح من 1 إلى 1000',
  'more than 1000 points are refused'
);
select throws_ok(
  $$ select public.award_task_points((select id from tests.p_ids where name = 'done'),
       array['00000000-0000-4000-8000-000000001204', '00000000-0000-4000-8000-000000001204']::uuid[], array[1, 2]) $$,
  '22023', 'الموظف مكرر',
  'one person once per award'
);
select throws_ok(
  $$ select public.award_task_points((select id from tests.p_ids where name = 'done'),
       array['00000000-0000-4000-8000-000000001204']::uuid[], array[1, 2]) $$,
  '22023', 'بيانات النقاط غير متطابقة',
  'every person needs one amount'
);
select throws_ok(
  $$ select public.award_task_points((select id from tests.p_ids where name = 'self'),
       array['00000000-0000-4000-8000-000000001202']::uuid[], array[50]) $$,
  '42501', 'لا تمنح نقاطاً لنفسك',
  'a manager cannot award themselves'
);

-- 11-13: the table is written only through the functions
select throws_ok(
  $$ insert into public.task_points (task_id, user_id, points, awarded_by)
     values ((select id from tests.p_ids where name = 'done'), '00000000-0000-4000-8000-000000001204', 999,
             '00000000-0000-4000-8000-000000001202') $$,
  '42501', null,
  'points cannot be inserted directly'
);
select throws_ok(
  $$ update public.task_points set points = 999 $$,
  '42501', null,
  'points cannot be edited directly'
);
select throws_ok(
  $$ delete from public.task_points $$,
  '42501', null,
  'points cannot be deleted directly'
);
reset role; select tests.clear_claims();

-- 14-16: who sees points
select tests.authenticate_as('00000000-0000-4000-8000-000000001204');
select is((select count(*)::int from public.task_points), 0, 'employees do not see points, even their own');
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001203');
select is((select count(*)::int from public.task_points), 0, 'another department''s manager sees none');
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001201');
select is(
  (select sum(points)::int from public.task_points where task_id = (select id from tests.p_ids where name = 'done')),
  15,
  'the general manager sees the department''s points'
);
-- The general manager adds a bonus to the same person later.
select is(
  public.award_task_points((select id from tests.p_ids where name = 'done'),
    array['00000000-0000-4000-8000-000000001205']::uuid[], array[3]),
  1,
  'points can be added more than once'
);
reset role; select tests.clear_claims();
insert into tests.p_ids select 'bonus', id from public.task_points where points = 3
  and task_id = (select id from tests.p_ids where name = 'done');

-- 18-21: voiding a mistaken award
select tests.authenticate_as('00000000-0000-4000-8000-000000001204');
select throws_ok(
  $$ select public.void_task_points((select id from tests.p_ids where name = 'bonus'), 'خطأ في الإدخال') $$,
  '42501', null,
  'an employee cannot void points'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001202');
select throws_ok(
  $$ select public.void_task_points((select id from tests.p_ids where name = 'bonus'), ' ') $$,
  'P0001', 'اكتب سبب الإلغاء',
  'voiding needs a reason'
);
select lives_ok(
  $$ select public.void_task_points((select id from tests.p_ids where name = 'bonus'), 'خطأ في الإدخال') $$,
  'the manager voids an award with a reason'
);
select throws_ok(
  $$ select public.void_task_points((select id from tests.p_ids where name = 'bonus'), 'مرة أخرى') $$,
  'P0001', 'النقاط ملغاة مسبقاً',
  'an award is voided once'
);

-- 22-24: the ranking leaves out voided awards and follows each manager's scope
select results_eq(
  $$ select full_name, points::int, tasks from public.report_points_by_person(current_date - 1, current_date + 1)
      where user_id in ('00000000-0000-4000-8000-000000001204', '00000000-0000-4000-8000-000000001205') $$,
  $$ values ('مستخدم تجريبي 0000'::text, 10, 1), ('مستخدم تجريبي 0000'::text, 5, 1) $$,
  'the ranking sums live points, highest first'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001203');
select is_empty(
  $$ select * from public.report_points_by_person(current_date - 1, current_date + 1)
      where user_id in ('00000000-0000-4000-8000-000000001204', '00000000-0000-4000-8000-000000001205') $$,
  'another department''s manager gets no ranking for them'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001204');
select is_empty(
  $$ select * from public.report_points_by_person(current_date - 1, current_date + 1) $$,
  'employees get no ranking'
);
reset role; select tests.clear_claims();

-- 25-26: awards and voids are audited
select ok(
  (select count(*) from audit.log
    where table_name = 'public.task_points'
      and record_id = (select id::text from tests.p_ids where name = 'bonus')) = 2,
  'an award and its void are both audited'
);
select is(
  (select count(*)::int from audit.log
    where table_name = 'public.task_points'
      and new_data ->> 'task_id' = (select id::text from tests.p_ids where name = 'done')
      and old_data is null),
  3,
  'every award is audited'
);

select * from finish();
rollback;
