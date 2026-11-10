-- Phase 6: machines, fault reports and repairs.
begin;
select plan(30);

-- Fixtures: GM 501 · maintenance manager 502 (d1) · production manager 503 (d2)
-- technician 504 (d1) · workers 505, 506 (d2)
insert into public.departments (id, name) values
  ('00000000-0000-4000-8000-0000000005d1', 'اختبار: الصيانة م6'),
  ('00000000-0000-4000-8000-0000000005d2', 'اختبار: الإنتاج م6');

do $$
begin
  perform tests.create_user('00000000-0000-4000-8000-000000000501', 'general_manager', null);
  perform tests.create_user('00000000-0000-4000-8000-000000000502', 'maintenance_manager', '00000000-0000-4000-8000-0000000005d1');
  perform tests.create_user('00000000-0000-4000-8000-000000000503', 'production_manager', '00000000-0000-4000-8000-0000000005d2');
  perform tests.create_user('00000000-0000-4000-8000-000000000504', 'employee', '00000000-0000-4000-8000-0000000005d1');
  perform tests.create_user('00000000-0000-4000-8000-000000000505', 'employee', '00000000-0000-4000-8000-0000000005d2');
  perform tests.create_user('00000000-0000-4000-8000-000000000506', 'employee', '00000000-0000-4000-8000-0000000005d2');
end $$;

create table tests.m_ids (name text primary key, id uuid not null);
grant select on tests.m_ids to authenticated;

-- 1-3: machines --------------------------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000502');
select lives_ok(
  $$ insert into public.machines (code, name, department_id) values ('T-CUT-01', 'اختبار: مقص الألواح', '00000000-0000-4000-8000-0000000005d2') $$,
  'the maintenance manager registers a machine'
);
reset role; select tests.clear_claims();
insert into tests.m_ids select 'machine', id from public.machines where code = 'T-CUT-01';

select tests.authenticate_as('00000000-0000-4000-8000-000000000503');
select throws_ok(
  $$ insert into public.machines (code, name) values ('T-X', 'آلة') $$,
  '42501', null,
  'the production manager cannot register machines'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000505');
select ok((select count(*) from public.machines where code = 'T-CUT-01') = 1, 'every user sees the machine list');

-- 4-8: reporting a fault -----------------------------------------------------------
select lives_ok(
  $$ select public.report_fault((select id from tests.m_ids where name = 'machine'), 'تسرب زيت من المكبس', true) $$,
  'a worker reports a fault that stopped the machine'
);
reset role; select tests.clear_claims();
insert into tests.m_ids select 'fault1', id from public.fault_reports where description = 'تسرب زيت من المكبس';
select is(
  (select status::text from public.machines where code = 'T-CUT-01'),
  'down',
  'the machine is marked down'
);
select is(
  (select count(*)::int from public.notifications
    where user_id = '00000000-0000-4000-8000-000000000502' and type = 'fault_reported'),
  1,
  'the maintenance manager is notified'
);

select tests.authenticate_as('00000000-0000-4000-8000-000000000506');
select is((select count(*)::int from public.fault_reports), 0, 'a colleague does not see someone else''s report');
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000503');
select is((select count(*)::int from public.fault_reports), 1, 'the reporter''s own manager sees it');

-- 9-15: only the maintenance manager assigns the repair -------------------------------
select throws_ok(
  $$ select public.assign_fault_repair((select id from tests.m_ids where name = 'fault1'), null, null, null,
       array['00000000-0000-4000-8000-000000000504']::uuid[], null) $$,
  '42501', null,
  'the production manager cannot assign the repair'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000501');
select throws_ok(
  $$ select public.assign_fault_repair((select id from tests.m_ids where name = 'fault1'), null, null, null,
       array['00000000-0000-4000-8000-000000000504']::uuid[], null) $$,
  '42501', null,
  'nor can the general manager'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000502');
select lives_ok(
  $$ select public.assign_fault_repair((select id from tests.m_ids where name = 'fault1'), null, null, null,
       array['00000000-0000-4000-8000-000000000504']::uuid[], null) $$,
  'the maintenance manager assigns the repair'
);
reset role; select tests.clear_claims();
insert into tests.m_ids select 'repair1', id from public.tasks where fault_report_id = (select id from tests.m_ids where name = 'fault1');
select is(
  (select status::text from public.fault_reports where id = (select id from tests.m_ids where name = 'fault1')),
  'assigned',
  'the fault is now assigned'
);
select is(
  (select status::text from public.machines where code = 'T-CUT-01'),
  'under_maintenance',
  'the machine is under maintenance'
);
select is(
  (select kind::text from public.tasks where id = (select id from tests.m_ids where name = 'repair1')),
  'repair',
  'the repair is a task of kind repair'
);
select tests.authenticate_as('00000000-0000-4000-8000-000000000504');
select is((select count(*)::int from public.fault_reports), 1, 'the technician sees the fault they are fixing');

-- 16-21: approving the repair resolves the fault -------------------------------------
select lives_ok(
  $$ select public.start_task((select id from tests.m_ids where name = 'repair1'));
     select public.submit_task((select id from tests.m_ids where name = 'repair1'), 'غيّرت الحشوة') $$,
  'the technician repairs and hands in'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000502');
select lives_ok($$ select public.approve_task((select id from tests.m_ids where name = 'repair1')) $$, 'the manager approves the repair');
reset role; select tests.clear_claims();
select is(
  (select status::text from public.fault_reports where id = (select id from tests.m_ids where name = 'fault1')),
  'resolved',
  'the fault is resolved'
);
select is(
  (select resolution_notes from public.fault_reports where id = (select id from tests.m_ids where name = 'fault1')),
  'غيّرت الحشوة',
  'with the technician''s note'
);
select is((select status::text from public.machines where code = 'T-CUT-01'), 'operational', 'the machine is back in service');
select is(
  (select count(*)::int from public.notifications
    where user_id = '00000000-0000-4000-8000-000000000505' and type = 'fault_resolved'),
  1,
  'the reporter is told it was fixed'
);

-- 22-25: rejecting a report ----------------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000505');
select lives_ok(
  $$ select public.report_fault((select id from tests.m_ids where name = 'machine'), 'صوت غريب', false) $$,
  'a second report'
);
reset role; select tests.clear_claims();
insert into tests.m_ids select 'fault2', id from public.fault_reports where description = 'صوت غريب';
select tests.authenticate_as('00000000-0000-4000-8000-000000000502');
select throws_ok(
  $$ select public.reject_fault((select id from tests.m_ids where name = 'fault2'), '') $$,
  'P0001', null,
  'rejecting needs a reason'
);
select lives_ok(
  $$ select public.reject_fault((select id from tests.m_ids where name = 'fault2'), 'الصوت طبيعي عند بدء التشغيل') $$,
  'the maintenance manager rejects it with a reason'
);
reset role; select tests.clear_claims();
select is(
  (select body from public.notifications
    where user_id = '00000000-0000-4000-8000-000000000505' and type = 'fault_rejected'),
  'الصوت طبيعي عند بدء التشغيل',
  'the reporter receives the reason'
);

-- 26-27: a cancelled repair sends the fault back -------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000505');
do $$ begin perform public.report_fault((select id from tests.m_ids where name = 'machine'), 'سير مقطوع', true); end $$;
reset role; select tests.clear_claims();
insert into tests.m_ids select 'fault3', id from public.fault_reports where description = 'سير مقطوع';
select tests.authenticate_as('00000000-0000-4000-8000-000000000502');
select lives_ok(
  $$ select public.cancel_task(
       public.assign_fault_repair((select id from tests.m_ids where name = 'fault3'), null, null, null,
         array['00000000-0000-4000-8000-000000000504']::uuid[], null),
       'القطعة غير متوفرة حالياً') $$,
  'a repair is assigned and then cancelled'
);
reset role; select tests.clear_claims();
select is(
  (select status::text from public.fault_reports where id = (select id from tests.m_ids where name = 'fault3')),
  'open',
  'the fault is open again for a new assignment'
);

-- 28-30: photos on a report ----------------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000505');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('attachments', 'faults/' || (select id from tests.m_ids where name = 'fault3') || '/belt.jpg') $$,
  'the reporter uploads a photo of the fault'
);
select lives_ok(
  $$ select public.register_fault_attachment(
       (select id from tests.m_ids where name = 'fault3'),
       'faults/' || (select id from tests.m_ids where name = 'fault3') || '/belt.jpg', 'image/jpeg', 2048) $$,
  'and it is recorded on the report'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000506');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('attachments', 'faults/' || (select id from tests.m_ids where name = 'fault3') || '/other.jpg') $$,
  '42501', null,
  'nobody else can add photos to the report'
);

select * from finish();
rollback;
