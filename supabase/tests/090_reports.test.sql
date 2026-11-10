-- Phase 10: report figures match a hand count, and each role sees its scope.
begin;
select plan(17);

-- Fixtures: GM 901 · maintenance manager 902 (d1) · production manager 903 (d2)
-- worker 904 (d1) · worker 905 (d2)
insert into public.departments (id, name) values
  ('00000000-0000-4000-8000-0000000009d1', 'اختبار: الصيانة م10'),
  ('00000000-0000-4000-8000-0000000009d2', 'اختبار: الإنتاج م10');

do $$
begin
  perform tests.create_user('00000000-0000-4000-8000-000000000901', 'general_manager', null);
  perform tests.create_user('00000000-0000-4000-8000-000000000902', 'maintenance_manager', '00000000-0000-4000-8000-0000000009d1');
  perform tests.create_user('00000000-0000-4000-8000-000000000903', 'production_manager', '00000000-0000-4000-8000-0000000009d2');
  perform tests.create_user('00000000-0000-4000-8000-000000000904', 'employee', '00000000-0000-4000-8000-0000000009d1');
  perform tests.create_user('00000000-0000-4000-8000-000000000905', 'employee', '00000000-0000-4000-8000-0000000009d2');
end $$;

create table tests.r_period as
  select private.factory_today() - 7 as from_day, private.factory_today() as to_day;
grant select on tests.r_period to authenticated;

-- Tasks, all created inside the period except the last one. In department 1:
-- on time (24h to approve), late and returned once (48h), overdue, cancelled.
-- In department 2: new, and waiting for approval.
insert into public.tasks (id, title, department_id, status, due_at, submitted_at, completed_at, created_at) values
  ('00000000-0000-4000-8000-00000000a001', 'في الموعد', '00000000-0000-4000-8000-0000000009d1', 'completed',
     now() + interval '24 hours', now() - interval '24 hours', now() - interval '24 hours', now() - interval '48 hours'),
  ('00000000-0000-4000-8000-00000000a002', 'متأخرة', '00000000-0000-4000-8000-0000000009d1', 'completed',
     now() - interval '60 hours', now() - interval '48 hours', now() - interval '24 hours', now() - interval '72 hours'),
  ('00000000-0000-4000-8000-00000000a003', 'فات موعدها', '00000000-0000-4000-8000-0000000009d1', 'in_progress',
     now() - interval '1 hour', null, null, now() - interval '30 hours'),
  ('00000000-0000-4000-8000-00000000a004', 'ملغاة', '00000000-0000-4000-8000-0000000009d1', 'cancelled',
     null, null, null, now() - interval '10 hours'),
  ('00000000-0000-4000-8000-00000000a005', 'جديدة', '00000000-0000-4000-8000-0000000009d2', 'new',
     null, null, null, now() - interval '5 hours'),
  ('00000000-0000-4000-8000-00000000a006', 'بانتظار الاعتماد', '00000000-0000-4000-8000-0000000009d2', 'pending_approval',
     null, now() - interval '1 hour', null, now() - interval '5 hours'),
  ('00000000-0000-4000-8000-00000000a007', 'قديمة', '00000000-0000-4000-8000-0000000009d1', 'completed',
     null, now() - interval '29 days', now() - interval '29 days', now() - interval '30 days');
insert into public.task_assignees (task_id, user_id) values
  ('00000000-0000-4000-8000-00000000a001', '00000000-0000-4000-8000-000000000904'),
  ('00000000-0000-4000-8000-00000000a002', '00000000-0000-4000-8000-000000000904'),
  ('00000000-0000-4000-8000-00000000a003', '00000000-0000-4000-8000-000000000904'),
  ('00000000-0000-4000-8000-00000000a005', '00000000-0000-4000-8000-000000000905'),
  ('00000000-0000-4000-8000-00000000a006', '00000000-0000-4000-8000-000000000905');
insert into public.task_events (task_id, event, from_status, to_status) values
  ('00000000-0000-4000-8000-00000000a002', 'status', 'pending_approval', 'needs_follow_up');

-- 1-7: tasks -----------------------------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000901');
select is(
  (select concat_ws(',', total, open, pending_approval, completed, cancelled, overdue,
                    completed_on_time, returned, avg_completion_hours)
     from public.report_task_summary((select from_day from tests.r_period), (select to_day from tests.r_period))),
  '6,2,1,2,1,1,1,1,36.0',
  'the general manager''s task summary matches the hand count'
);
select is(
  (select total from public.report_task_summary((select from_day from tests.r_period), (select to_day from tests.r_period),
     '00000000-0000-4000-8000-0000000009d2')),
  2,
  'the department filter narrows the summary'
);
select is(
  (select concat_ws(',', total, completed, completed_on_time, overdue, avg_completion_hours)
     from public.report_tasks_by_department((select from_day from tests.r_period), (select to_day from tests.r_period))
    where department_id = '00000000-0000-4000-8000-0000000009d1'),
  '4,2,1,1,36.0',
  'per department'
);
select is(
  (select concat_ws(',', assigned, completed, completed_on_time, overdue, returned)
     from public.report_tasks_by_person((select from_day from tests.r_period), (select to_day from tests.r_period))
    where user_id = '00000000-0000-4000-8000-000000000904'),
  '3,2,1,1,1',
  'per person'
);
select throws_ok(
  $$ select * from public.report_task_summary((select to_day from tests.r_period), (select from_day from tests.r_period)) $$,
  'P0001', 'الفترة غير صحيحة',
  'a period that ends before it starts is refused'
);
reset role; select tests.clear_claims();

select tests.authenticate_as('00000000-0000-4000-8000-000000000902');
select is(
  (select total from public.report_task_summary((select from_day from tests.r_period), (select to_day from tests.r_period))),
  4,
  'the maintenance manager counts only their department'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000903');
select is(
  (select total from public.report_task_summary((select from_day from tests.r_period), (select to_day from tests.r_period))),
  2,
  'the production manager counts only theirs'
);
reset role; select tests.clear_claims();

-- 8-10: maintenance ------------------------------------------------------------------
-- A fault that stopped the machine and was repaired 6 hours later (repair
-- task created after 1 hour), an open one, and a rejected one.
insert into public.machines (id, code, name) values
  ('00000000-0000-4000-8000-00000000b001', 'T10-M', 'اختبار م10: مكبس');
insert into public.fault_reports (id, machine_id, reported_by, description, machine_stopped, status, resolved_at, created_at) values
  ('00000000-0000-4000-8000-00000000f001', '00000000-0000-4000-8000-00000000b001', '00000000-0000-4000-8000-000000000905',
     'تسرب', true, 'resolved', now() - interval '4 hours', now() - interval '10 hours'),
  ('00000000-0000-4000-8000-00000000f002', '00000000-0000-4000-8000-00000000b001', '00000000-0000-4000-8000-000000000905',
     'صوت', false, 'open', null, now() - interval '3 hours'),
  ('00000000-0000-4000-8000-00000000f003', '00000000-0000-4000-8000-00000000b001', '00000000-0000-4000-8000-000000000905',
     'بلاغ خاطئ', true, 'rejected', null, now() - interval '2 hours');
insert into public.tasks (title, kind, department_id, status, fault_report_id, created_at) values
  ('إصلاح', 'repair', '00000000-0000-4000-8000-0000000009d1', 'completed',
     '00000000-0000-4000-8000-00000000f001', now() - interval '9 hours');

select tests.authenticate_as('00000000-0000-4000-8000-000000000902');
select is(
  (select concat_ws(',', reported, open_now, resolved, rejected, avg_response_hours, avg_repair_hours, downtime_hours)
     from public.report_maintenance_summary((select from_day from tests.r_period), (select to_day from tests.r_period))),
  '3,1,1,1,1.0,6.0,6.0',
  'the maintenance summary: response 1h, repair 6h, downtime 6h without the rejected report'
);
select is(
  (select concat_ws(',', faults, stopped, downtime_hours, avg_repair_hours)
     from public.report_faults_by_machine((select from_day from tests.r_period), (select to_day from tests.r_period))
    where code = 'T10-M'),
  '3,2,6.0,6.0',
  'per machine'
);
reset role; select tests.clear_claims();

-- Preventive tasks due on past days: on time, late, missed, cancelled; and one
-- due today, which does not count yet.
insert into public.tasks (title, kind, department_id, status, pm_due_date, due_at, submitted_at, created_at) values
  ('وقائية 1', 'preventive', '00000000-0000-4000-8000-0000000009d1', 'completed', private.factory_today() - 1,
     now() + interval '1 hour', now() - interval '1 hour', now() - interval '20 hours'),
  ('وقائية 2', 'preventive', '00000000-0000-4000-8000-0000000009d1', 'completed', private.factory_today() - 2,
     now() - interval '30 hours', now() - interval '20 hours', now() - interval '40 hours'),
  ('وقائية 3', 'preventive', '00000000-0000-4000-8000-0000000009d1', 'in_progress', private.factory_today() - 3,
     now() - interval '50 hours', null, now() - interval '60 hours'),
  ('وقائية 4', 'preventive', '00000000-0000-4000-8000-0000000009d1', 'cancelled', private.factory_today() - 4,
     null, null, now() - interval '80 hours'),
  ('وقائية 5', 'preventive', '00000000-0000-4000-8000-0000000009d1', 'new', private.factory_today(),
     now() + interval '5 hours', null, now() - interval '1 hour');
select tests.authenticate_as('00000000-0000-4000-8000-000000000902');
select is(
  (select concat_ws(',', due, on_time, late, missed, cancelled)
     from public.report_pm_compliance((select from_day from tests.r_period), (select to_day from tests.r_period))),
  '3,1,1,1,1',
  'preventive compliance counts past due dates only'
);
reset role; select tests.clear_claims();

-- 11-17: production ----------------------------------------------------------------
-- An order of 100 through two stages: the first recorded 50 good and 5
-- defective, the second 40 and 2. A voided and an old entry do not count.
insert into public.stages (id, name, sort_order) values
  ('00000000-0000-4000-8000-00000000c001', 'اختبار م10: قص', 1),
  ('00000000-0000-4000-8000-00000000c002', 'اختبار م10: تغليف', 2);
insert into public.products (id, code, name, unit) values
  ('00000000-0000-4000-8000-00000000d001', 'T10-P', 'اختبار م10: لوح', 'لوح');
insert into public.defect_types (id, name) values
  ('00000000-0000-4000-8000-00000000e001', 'اختبار م10: خدش');
insert into public.production_orders (id, product_id, department_id, quantity, unit, status) values
  ('00000000-0000-4000-8000-00000000d101', '00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-0000000009d2',
     100, 'لوح', 'in_progress');
insert into public.order_stages (id, order_id, seq, stage_id, status, good_qty, defect_qty) values
  ('00000000-0000-4000-8000-00000000d201', '00000000-0000-4000-8000-00000000d101', 1,
     '00000000-0000-4000-8000-00000000c001', 'active', 50, 5),
  ('00000000-0000-4000-8000-00000000d202', '00000000-0000-4000-8000-00000000d101', 2,
     '00000000-0000-4000-8000-00000000c002', 'active', 40, 2);
insert into public.stage_entries (order_stage_id, worker_id, good_qty, defect_qty, defect_type_id, recorded_by, created_at, voided_at, voided_by, void_reason) values
  ('00000000-0000-4000-8000-00000000d201', '00000000-0000-4000-8000-000000000905', 50, 5,
     '00000000-0000-4000-8000-00000000e001', '00000000-0000-4000-8000-000000000905', now() - interval '3 hours', null, null, null),
  ('00000000-0000-4000-8000-00000000d202', '00000000-0000-4000-8000-000000000905', 40, 2,
     '00000000-0000-4000-8000-00000000e001', '00000000-0000-4000-8000-000000000905', now() - interval '2 hours', null, null, null),
  ('00000000-0000-4000-8000-00000000d201', '00000000-0000-4000-8000-000000000905', 10, 0,
     null, '00000000-0000-4000-8000-000000000905', now() - interval '2 hours', now(), '00000000-0000-4000-8000-000000000903', 'عدّ مكرر'),
  ('00000000-0000-4000-8000-00000000d201', '00000000-0000-4000-8000-000000000905', 7, 0,
     null, '00000000-0000-4000-8000-000000000905', now() - interval '20 days', null, null, null);

select tests.authenticate_as('00000000-0000-4000-8000-000000000903');
select is(
  (select concat_ws(',', orders_running, orders_completed, orders_late, good_qty, defect_qty)
     from public.report_production_summary((select from_day from tests.r_period), (select to_day from tests.r_period))),
  '1,0,0,90.000,7.000',
  'the production summary leaves out voided and old entries'
);
select is(
  (select string_agg(concat_ws(',', stage_name, good_qty, defect_qty, waiting_qty), ' | ' order by stage_name)
     from public.report_production_by_stage((select from_day from tests.r_period), (select to_day from tests.r_period))),
  'اختبار م10: تغليف,40.000,2.000,8.000 | اختبار م10: قص,50.000,5.000,45.000',
  'per stage, with what is waiting now'
);
select is(
  (select concat_ws(',', finished_qty, defect_qty)
     from public.report_production_by_product((select from_day from tests.r_period), (select to_day from tests.r_period))
    where code = 'T10-P'),
  '40.000,7.000',
  'per product: finished means good at the last stage'
);
select is(
  (select concat_ws(',', entries, good_qty, defect_qty)
     from public.report_production_by_worker((select from_day from tests.r_period), (select to_day from tests.r_period))
    where worker_id = '00000000-0000-4000-8000-000000000905'),
  '2,90.000,7.000',
  'per worker'
);
select is(
  (select concat_ws(',', entries, defect_qty)
     from public.report_defects_by_type((select from_day from tests.r_period), (select to_day from tests.r_period))
    where name = 'اختبار م10: خدش'),
  '2,7.000',
  'per defect type'
);
reset role; select tests.clear_claims();

select tests.authenticate_as('00000000-0000-4000-8000-000000000902');
select is(
  (select good_qty from public.report_production_summary((select from_day from tests.r_period), (select to_day from tests.r_period))),
  0::numeric,
  'the maintenance manager sees no production figures'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000905');
select is(
  (select total from public.report_task_summary((select from_day from tests.r_period), (select to_day from tests.r_period))),
  2,
  'a worker''s report covers only their own tasks'
);
reset role; select tests.clear_claims();

select * from finish();
rollback;
