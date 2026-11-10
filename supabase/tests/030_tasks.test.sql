-- Phases 3-4: teams, tasks and the task lifecycle.
begin;
select plan(40);

-- Fixtures ------------------------------------------------------------------------
-- GM 301 · maintenance manager 302 (dept d1) · production manager 303 (dept d2)
-- employees 304, 305 (d1) · employee 306 (d2) · inactive employee 307 (d1)
insert into public.departments (id, name) values
  ('00000000-0000-4000-8000-0000000003d1', 'اختبار: صيانة المهام'),
  ('00000000-0000-4000-8000-0000000003d2', 'اختبار: إنتاج المهام');

do $$
begin
  perform tests.create_user('00000000-0000-4000-8000-000000000301', 'general_manager', null);
  perform tests.create_user('00000000-0000-4000-8000-000000000302', 'maintenance_manager', '00000000-0000-4000-8000-0000000003d1');
  perform tests.create_user('00000000-0000-4000-8000-000000000303', 'production_manager', '00000000-0000-4000-8000-0000000003d2');
  perform tests.create_user('00000000-0000-4000-8000-000000000304', 'employee', '00000000-0000-4000-8000-0000000003d1');
  perform tests.create_user('00000000-0000-4000-8000-000000000305', 'employee', '00000000-0000-4000-8000-0000000003d1');
  perform tests.create_user('00000000-0000-4000-8000-000000000306', 'employee', '00000000-0000-4000-8000-0000000003d2');
  perform tests.create_user('00000000-0000-4000-8000-000000000307', 'employee', '00000000-0000-4000-8000-0000000003d1', false);
end $$;

-- Ids of tasks created during the test, readable while acting as any user.
create table tests.task_ids (name text primary key, id uuid not null);
grant select on tests.task_ids to authenticated;

-- 1-5: teams ------------------------------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000302');
select lives_ok(
  $$ insert into public.teams (department_id, name)
     values ('00000000-0000-4000-8000-0000000003d1', 'اختبار: فريق الصيانة أ') $$,
  'a department manager creates a team in their department'
);
select throws_ok(
  $$ insert into public.teams (department_id, name) values ('00000000-0000-4000-8000-0000000003d2', 'فريق غريب') $$,
  '42501', null,
  'but not in another department'
);
reset role; select tests.clear_claims();
insert into tests.task_ids select 'teamA', id from public.teams where name = 'اختبار: فريق الصيانة أ';
select tests.authenticate_as('00000000-0000-4000-8000-000000000302');
select lives_ok(
  $$ insert into public.team_members (team_id, user_id) values
     ((select id from tests.task_ids where name = 'teamA'), '00000000-0000-4000-8000-000000000304'),
     ((select id from tests.task_ids where name = 'teamA'), '00000000-0000-4000-8000-000000000305') $$,
  'and adds two employees'
);
select throws_ok(
  $$ insert into public.team_members (team_id, user_id) values
     ((select id from tests.task_ids where name = 'teamA'), '00000000-0000-4000-8000-000000000306') $$,
  'P0001', null,
  'a team member must come from the team''s department'
);

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000306');
select is((select count(*)::int from public.teams where id = (select id from tests.task_ids where name = 'teamA')), 0,
  'employees of other departments do not see the team');

-- 6-14: creating tasks ----------------------------------------------------------------
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000302');
select lives_ok(
  $$ select public.create_task('اختبار: فحص المضخة', 'وصف', now() + interval '1 day', null,
       array['00000000-0000-4000-8000-000000000304']::uuid[], null) $$,
  'a manager creates a task for an employee'
);
select lives_ok(
  $$ select public.create_task('اختبار: مهمة الفريق', null, null, null, null,
       (select id from tests.task_ids where name = 'teamA')) $$,
  'and a task for a team'
);
select throws_ok(
  $$ select public.create_task('مهمة', null, null, '00000000-0000-4000-8000-0000000003d2',
       array['00000000-0000-4000-8000-000000000306']::uuid[], null) $$,
  '42501', null,
  'a manager cannot create tasks for another department'
);
select throws_ok(
  $$ select public.create_task('مهمة', null, null, null,
       array['00000000-0000-4000-8000-000000000306']::uuid[], null) $$,
  'P0001', null,
  'nor assign them to staff of another department'
);
select throws_ok(
  $$ select public.create_task('مهمة', null, null, null,
       array['00000000-0000-4000-8000-000000000304']::uuid[], (select id from tests.task_ids where name = 'teamA')) $$,
  'P0001', null,
  'a task goes to a person or a team, not both'
);
select throws_ok(
  $$ select public.create_task('مهمة', null, now() - interval '1 day', null,
       array['00000000-0000-4000-8000-000000000304']::uuid[], null) $$,
  'P0001', null,
  'a due time in the past is rejected'
);

reset role; select tests.clear_claims();
insert into tests.task_ids
select 'single', id from public.tasks where title = 'اختبار: فحص المضخة'
union all
select 'team', id from public.tasks where title = 'اختبار: مهمة الفريق';

select is(
  (select count(*)::int from public.task_assignees where task_id = (select id from tests.task_ids where name = 'team')),
  2,
  'a team task is assigned to every active team member'
);
select is(
  (select count(*)::int from public.notifications
    where user_id = '00000000-0000-4000-8000-000000000304' and type = 'task_assigned'),
  2,
  'each assignee is notified'
);

select tests.authenticate_as('00000000-0000-4000-8000-000000000304');
select throws_ok(
  $$ select public.create_task('مهمة', null, null, null,
       array['00000000-0000-4000-8000-000000000305']::uuid[], null) $$,
  '42501', null,
  'employees cannot create tasks'
);

-- 15-20: who sees which task ---------------------------------------------------------
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000301');
select lives_ok(
  $$ select public.create_task('اختبار: مهمة الإنتاج', null, null, '00000000-0000-4000-8000-0000000003d2',
       array['00000000-0000-4000-8000-000000000306']::uuid[], null) $$,
  'the general manager creates a task for any department'
);
select is((select count(*)::int from public.tasks where title like 'اختبار:%'), 3, 'the general manager sees every task');

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000304');
select is((select count(*)::int from public.tasks where title like 'اختبار:%'), 2, 'an employee sees the tasks assigned to them');

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000303');
select is((select count(*)::int from public.tasks where title like 'اختبار:%'), 1, 'a manager sees their department''s tasks only');

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000307');
select is((select count(*)::int from public.tasks), 0, 'a deactivated user sees no tasks');

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000304');
select throws_ok(
  $$ update public.tasks set status = 'completed' $$,
  '42501', null,
  'tasks cannot be changed directly'
);

-- 21-23: seen and acknowledged --------------------------------------------------------
select lives_ok(
  $$ select public.mark_task_seen((select id from tests.task_ids where name = 'single')) $$,
  'opening a task marks it seen'
);
select lives_ok(
  $$ select public.acknowledge_task((select id from tests.task_ids where name = 'single')) $$,
  'the assignee acknowledges it'
);
reset role; select tests.clear_claims();
select is(
  (select status::text from public.tasks where id = (select id from tests.task_ids where name = 'single')),
  'received',
  'and the task becomes received'
);

-- 24-30: the lifecycle ---------------------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000305');
select throws_ok(
  $$ select public.acknowledge_task((select id from tests.task_ids where name = 'single')) $$,
  '42501', null,
  'someone else''s task cannot be acknowledged'
);

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000304');
select throws_ok(
  $$ select public.submit_task((select id from tests.task_ids where name = 'single')) $$,
  'P0001', null,
  'a task is started before it is handed in'
);
select lives_ok($$ select public.start_task((select id from tests.task_ids where name = 'single')) $$, 'the assignee starts');
select lives_ok(
  $$ select public.submit_task((select id from tests.task_ids where name = 'single'), 'تم تغيير الحشوة') $$,
  'and hands it in with a note'
);
select throws_ok(
  $$ select public.approve_task((select id from tests.task_ids where name = 'single')) $$,
  '42501', null,
  'an employee cannot approve their own task'
);

reset role; select tests.clear_claims();
select is(
  (select count(*)::int from public.notifications
    where user_id = '00000000-0000-4000-8000-000000000302' and type = 'task_submitted'),
  1,
  'the manager is told the task awaits approval'
);

select tests.authenticate_as('00000000-0000-4000-8000-000000000303');
select throws_ok(
  $$ select public.approve_task((select id from tests.task_ids where name = 'single')) $$,
  '42501', null,
  'a manager of another department cannot approve it'
);

-- 31-35: return with a reason, then approve ------------------------------------------
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000302');
select throws_ok(
  $$ select public.return_task((select id from tests.task_ids where name = 'single'), '  ') $$,
  'P0001', 'اكتب سبب الإعادة',
  'returning a task needs a reason'
);
select lives_ok(
  $$ select public.return_task((select id from tests.task_ids where name = 'single'), 'الحشوة ما زالت ترشح') $$,
  'the manager returns it with a reason'
);

reset role; select tests.clear_claims();
select is(
  (select body from public.notifications
    where user_id = '00000000-0000-4000-8000-000000000304' and type = 'task_returned'),
  'الحشوة ما زالت ترشح',
  'the employee receives the reason'
);

select tests.authenticate_as('00000000-0000-4000-8000-000000000304');
select lives_ok(
  $$ select public.start_task((select id from tests.task_ids where name = 'single'));
     select public.submit_task((select id from tests.task_ids where name = 'single')) $$,
  'the employee follows up and hands it in again'
);

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000302');
select lives_ok($$ select public.approve_task((select id from tests.task_ids where name = 'single')) $$, 'the manager approves');

-- 36-38: final states and cancellation ---------------------------------------------
select throws_ok(
  $$ select public.cancel_task((select id from tests.task_ids where name = 'single'), 'سبب كاف') $$,
  'P0001', null,
  'a completed task cannot be cancelled'
);
select throws_ok(
  $$ select public.cancel_task((select id from tests.task_ids where name = 'team'), '') $$,
  'P0001', null,
  'cancelling needs a reason'
);
select lives_ok(
  $$ select public.cancel_task((select id from tests.task_ids where name = 'team'), 'لم تعد مطلوبة') $$,
  'an open task is cancelled with a reason'
);

-- 39: overdue -------------------------------------------------------------------------
reset role; select tests.clear_claims();
update public.tasks set status = 'in_progress', due_at = now() - interval '1 hour'
 where title = 'اختبار: مهمة الإنتاج';
select ok(
  (select public.is_overdue(t) from public.tasks t where t.title = 'اختبار: مهمة الإنتاج'),
  'an open task past its due time is overdue'
);

-- 40: the timeline records every step ------------------------------------------------
select is(
  (select array_agg(to_status::text order by id) from public.task_events
    where task_id = (select id from tests.task_ids where name = 'single') and event = 'status'),
  array['received', 'in_progress', 'pending_approval', 'needs_follow_up', 'in_progress', 'pending_approval', 'completed'],
  'the timeline holds every status change in order'
);

select * from finish();
rollback;
