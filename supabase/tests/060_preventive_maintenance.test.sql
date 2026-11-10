-- Phase 7: preventive maintenance plans and automatic task creation.
begin;
select plan(18);

-- 1-4: occurrence arithmetic ------------------------------------------------------------
select is(public.pm_next_occurrence('2026-01-01', 'day', 3, '2026-01-05'), '2026-01-07'::date, 'every three days');
select is(public.pm_next_occurrence('2026-01-01', 'week', 1, '2026-01-09'), '2026-01-15'::date, 'weekly');
select is(public.pm_next_occurrence('2026-01-31', 'month', 1, '2026-02-01'), '2026-02-28'::date, 'monthly, at the end of a short month');
select is(public.pm_next_occurrence('2026-01-31', 'month', 1, '2026-03-01'), '2026-03-31'::date, 'and back to the 31st without drifting');

-- Fixtures: GM 601 · maintenance manager 602 (d1) · production manager 603 (d2)
-- technicians 604, 605 (d1)
insert into public.departments (id, name) values
  ('00000000-0000-4000-8000-0000000006d1', 'اختبار: صيانة وقائية'),
  ('00000000-0000-4000-8000-0000000006d2', 'اختبار: إنتاج وقائي');

do $$
begin
  perform tests.create_user('00000000-0000-4000-8000-000000000601', 'general_manager', null);
  perform tests.create_user('00000000-0000-4000-8000-000000000602', 'maintenance_manager', '00000000-0000-4000-8000-0000000006d1');
  perform tests.create_user('00000000-0000-4000-8000-000000000603', 'production_manager', '00000000-0000-4000-8000-0000000006d2');
  perform tests.create_user('00000000-0000-4000-8000-000000000604', 'employee', '00000000-0000-4000-8000-0000000006d1');
  perform tests.create_user('00000000-0000-4000-8000-000000000605', 'employee', '00000000-0000-4000-8000-0000000006d1');
end $$;

insert into public.machines (id, code, name) values
  ('00000000-0000-4000-8000-00000000060a', 'T-PM-01', 'اختبار: ضاغط الهواء');

-- 5-10: a daily plan -----------------------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000603');
select throws_ok(
  $$ select public.create_pm_plan('00000000-0000-4000-8000-00000000060a', 'تشحيم', null, 'day', 1,
       private.factory_today(), 0, '00000000-0000-4000-8000-000000000604', null) $$,
  '42501', null,
  'the production manager cannot create preventive plans'
);
reset role; select tests.clear_claims();

select tests.authenticate_as('00000000-0000-4000-8000-000000000602');
select lives_ok(
  $$ select public.create_pm_plan('00000000-0000-4000-8000-00000000060a', 'اختبار: تشحيم يومي', 'شحّم المحامل', 'day', 1,
       private.factory_today(), 0, '00000000-0000-4000-8000-000000000604', null) $$,
  'the maintenance manager creates a daily plan'
);
reset role; select tests.clear_claims();

select is((select private.generate_pm_tasks()), 1, 'the job creates today''s task');
select is(
  (select pm_due_date from public.tasks
    where pm_plan_id = (select id from public.pm_plans where title = 'اختبار: تشحيم يومي')),
  private.factory_today(),
  'due today, in the factory''s time zone'
);
select is((select private.generate_pm_tasks()), 0, 'running the job again creates nothing');
select is(
  (select next_due_date from public.pm_plans where title = 'اختبار: تشحيم يومي'),
  private.factory_today() + 1,
  'and the plan moves on to tomorrow'
);

-- 11-13: missed occurrences collapse into one -------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000602');
select lives_ok(
  $$ select public.create_pm_plan('00000000-0000-4000-8000-00000000060a', 'اختبار: فحص فائت', null, 'day', 1,
       private.factory_today() - 10, 0, '00000000-0000-4000-8000-000000000604', null) $$,
  'a plan that started ten days ago'
);
reset role; select tests.clear_claims();
-- As if the job had been down for ten days.
update public.pm_plans set next_due_date = start_date where title = 'اختبار: فحص فائت';
select is((select private.generate_pm_tasks()), 1, 'only one task is created for the missed days');
select is(
  (select array_agg(pm_due_date) from public.tasks
    where pm_plan_id = (select id from public.pm_plans where title = 'اختبار: فحص فائت')),
  array[private.factory_today()],
  'for the latest occurrence'
);

-- 14-15: lead days -------------------------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000602');
select lives_ok(
  $$ select public.create_pm_plan('00000000-0000-4000-8000-00000000060a', 'اختبار: أسبوعي مبكر', null, 'week', 1,
       private.factory_today() + 3, 3, '00000000-0000-4000-8000-000000000604', null) $$,
  'a weekly plan created three days ahead'
);
reset role; select tests.clear_claims();
select is(
  (select private.generate_pm_tasks()),
  1,
  'its task is created three days before it is due'
);

-- 16-17: a deactivated assignee does not stop the job -------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000602');
do $$ begin
  perform public.create_pm_plan('00000000-0000-4000-8000-00000000060a', 'اختبار: خطة متعثرة', null, 'day', 1,
    private.factory_today(), 0, '00000000-0000-4000-8000-000000000605', null);
end $$;
reset role; select tests.clear_claims();
update public.profiles set is_active = false where id = '00000000-0000-4000-8000-000000000605';
select is((select private.generate_pm_tasks()), 0, 'a plan whose assignee left creates no task');
select is(
  (select count(*)::int from public.notifications
    where user_id = '00000000-0000-4000-8000-000000000602' and type = 'pm_failed'),
  1,
  'and the maintenance manager is told why'
);

-- 18: the manual run is for maintenance managers only --------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000604');
select throws_ok($$ select public.run_pm_generation_now() $$, '42501', null, 'employees cannot run the job');

select * from finish();
rollback;
