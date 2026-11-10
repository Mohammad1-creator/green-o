-- Phase 9: production orders, stage assignment and quantities.
begin;
select plan(44);

-- Fixtures: GM 801 · production manager 802 (d2) · maintenance manager 803 (d1)
-- workers 804, 805 (d2) · maintenance technician 806 (d1)
insert into public.departments (id, name) values
  ('00000000-0000-4000-8000-0000000008d1', 'اختبار: الصيانة م9'),
  ('00000000-0000-4000-8000-0000000008d2', 'اختبار: الإنتاج م9');

do $$
begin
  perform tests.create_user('00000000-0000-4000-8000-000000000801', 'general_manager', null);
  perform tests.create_user('00000000-0000-4000-8000-000000000802', 'production_manager', '00000000-0000-4000-8000-0000000008d2');
  perform tests.create_user('00000000-0000-4000-8000-000000000803', 'maintenance_manager', '00000000-0000-4000-8000-0000000008d1');
  perform tests.create_user('00000000-0000-4000-8000-000000000804', 'employee', '00000000-0000-4000-8000-0000000008d2');
  perform tests.create_user('00000000-0000-4000-8000-000000000805', 'employee', '00000000-0000-4000-8000-0000000008d2');
  perform tests.create_user('00000000-0000-4000-8000-000000000806', 'employee', '00000000-0000-4000-8000-0000000008d1');
end $$;

create table tests.o_ids (name text primary key, id uuid not null);
grant select on tests.o_ids to authenticated;

-- The catalog: three stages, a product routed through them, defect types.
insert into public.stages (name, sort_order) values ('اختبار م9: قص', 1), ('اختبار م9: تصفيح', 2), ('اختبار م9: تغليف', 3);
insert into tests.o_ids select 's1', id from public.stages where name = 'اختبار م9: قص';
insert into tests.o_ids select 's2', id from public.stages where name = 'اختبار م9: تصفيح';
insert into tests.o_ids select 's3', id from public.stages where name = 'اختبار م9: تغليف';
insert into public.products (code, name, unit) values ('T9-P', 'اختبار م9: لوح', 'لوح'), ('T9-NOROUTE', 'اختبار م9: بلا مسار', 'لوح');
insert into tests.o_ids select 'product', id from public.products where code = 'T9-P';
insert into tests.o_ids select 'noroute', id from public.products where code = 'T9-NOROUTE';
insert into public.product_route_steps (product_id, seq, stage_id)
select (select id from tests.o_ids where name = 'product'), n, (select id from tests.o_ids where name = 's' || n)
  from generate_series(1, 3) as n;
insert into public.defect_types (name, stage_id) values
  ('اختبار م9: كسر', (select id from tests.o_ids where name = 's1')),
  ('اختبار م9: تلف التغليف', (select id from tests.o_ids where name = 's3'));
insert into tests.o_ids select 'break', id from public.defect_types where name = 'اختبار م9: كسر';
insert into tests.o_ids select 'wrap', id from public.defect_types where name = 'اختبار م9: تلف التغليف';

-- 1-6: creating orders ---------------------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000802');
select lives_ok(
  $$ select public.create_production_order((select id from tests.o_ids where name = 'product'), 100, null, 'أمر اختبار') $$,
  'the production manager creates an order'
);
reset role; select tests.clear_claims();
insert into tests.o_ids select 'order', id from public.production_orders where notes = 'أمر اختبار';
insert into tests.o_ids select 'os' || seq, id from public.order_stages
 where order_id = (select id from tests.o_ids where name = 'order');

select is(
  (select count(*)::int from public.order_stages where order_id = (select id from tests.o_ids where name = 'order')),
  3,
  'the order copies the product route'
);
-- Changing the route later does not touch the order.
delete from public.product_route_steps where product_id = (select id from tests.o_ids where name = 'product') and seq > 1;
select is(
  (select count(*)::int from public.order_stages where order_id = (select id from tests.o_ids where name = 'order')),
  3,
  'a later route change leaves running orders alone'
);

select tests.authenticate_as('00000000-0000-4000-8000-000000000802');
select throws_ok(
  $$ select public.create_production_order((select id from tests.o_ids where name = 'noroute'), 10) $$,
  'P0001', 'حدّد مسار مراحل المنتج أولاً',
  'a product needs a route'
);
select throws_ok(
  $$ select public.create_production_order((select id from tests.o_ids where name = 'product'), 1.2345) $$,
  'P0001', 'كمية الأمر: ثلاث خانات عشرية على الأكثر',
  'quantities have at most three decimals'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000803');
select throws_ok(
  $$ select public.create_production_order((select id from tests.o_ids where name = 'product'), 10) $$,
  '42501', null,
  'the maintenance manager cannot create orders'
);
reset role; select tests.clear_claims();

-- 7-11: assigning workers ------------------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000802');
select lives_ok(
  $$ select public.assign_stage_workers((select id from tests.o_ids where name = 'os1'), array['00000000-0000-4000-8000-000000000804']::uuid[]) $$,
  'the production manager assigns workers to a stage'
);
select public.assign_stage_workers((select id from tests.o_ids where name = 'os2'), array['00000000-0000-4000-8000-000000000805']::uuid[]);
select public.assign_stage_workers((select id from tests.o_ids where name = 'os3'), array['00000000-0000-4000-8000-000000000804']::uuid[]);
select throws_ok(
  $$ select public.assign_stage_workers((select id from tests.o_ids where name = 'os1'), array['00000000-0000-4000-8000-000000000806']::uuid[]) $$,
  'P0001', 'العمال يجب أن يكونوا من قسم الأمر وحساباتهم نشطة',
  'workers come from the order''s department'
);
reset role; select tests.clear_claims();
select is(
  (select count(*)::int from public.notifications
    where user_id = '00000000-0000-4000-8000-000000000804' and type = 'stage_assigned'),
  2,
  'an assigned worker is notified once per stage'
);

select tests.authenticate_as('00000000-0000-4000-8000-000000000804');
select is((select count(*)::int from public.production_orders), 1, 'an assigned worker sees the order');
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000806');
select is((select count(*)::int from public.production_orders), 0, 'other workers do not');
reset role; select tests.clear_claims();

-- 12-21: recording quantities --------------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000804');
select lives_ok(
  $$ select public.record_stage_entry((select id from tests.o_ids where name = 'os1'), 60, 5, (select id from tests.o_ids where name = 'break')) $$,
  'a worker records good and defective quantities'
);
select is(
  (select public.available_qty(s) from public.order_stages s where s.id = (select id from tests.o_ids where name = 'os1')),
  35.000,
  'the first stage has 100 - 60 - 5 left'
);
select is(
  (select status::text from public.production_orders where id = (select id from tests.o_ids where name = 'order')),
  'in_progress',
  'the first entry starts the order'
);
select throws_ok(
  $$ select public.record_stage_entry((select id from tests.o_ids where name = 'os1'), 36) $$,
  'P0001', 'الكمية أكبر من المتاح لهذه المرحلة. المتاح الآن: 35',
  'a stage cannot record more than it has'
);
select throws_ok(
  $$ select public.record_stage_entry((select id from tests.o_ids where name = 'os1'), 0, 2) $$,
  'P0001', 'اختر نوع العيب',
  'defects need a defect type'
);
select throws_ok(
  $$ select public.record_stage_entry((select id from tests.o_ids where name = 'os1'), 0, 2, (select id from tests.o_ids where name = 'wrap')) $$,
  'P0001', 'نوع العيب لا يخص هذه المرحلة',
  'the defect type must belong to the stage'
);
select throws_ok(
  $$ select public.record_stage_entry((select id from tests.o_ids where name = 'os2'), 1) $$,
  '42501', 'العامل غير مُسند إلى هذه المرحلة',
  'a worker records only on their own stages'
);
select throws_ok(
  $$ select public.record_stage_entry((select id from tests.o_ids where name = 'os1'), 1, 0, null, null, '00000000-0000-4000-8000-000000000805') $$,
  '42501', 'تسجّل كمياتك أنت فقط',
  'a worker cannot record for a colleague'
);
reset role; select tests.clear_claims();

-- The second stage works in parallel on the 60 good pieces.
select tests.authenticate_as('00000000-0000-4000-8000-000000000805');
select lives_ok(
  $$ select public.record_stage_entry((select id from tests.o_ids where name = 'os2'), 50) $$,
  'the next stage starts while the first is still running'
);
select throws_ok(
  $$ select public.record_stage_entry((select id from tests.o_ids where name = 'os2'), 11) $$,
  'P0001', 'الكمية أكبر من المتاح لهذه المرحلة. المتاح الآن: 10',
  'the next stage is limited by the good quantity before it'
);
reset role; select tests.clear_claims();

-- 22-24: recording on a worker's behalf ------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000802');
select throws_ok(
  $$ select public.record_stage_entry((select id from tests.o_ids where name = 'os2'), 1) $$,
  'P0001', 'اختر العامل',
  'the manager names the worker'
);
select lives_ok(
  $$ select public.record_stage_entry((select id from tests.o_ids where name = 'os2'), 10, 0, null, 'سجّله المدير', '00000000-0000-4000-8000-000000000805') $$,
  'the manager records on a worker''s behalf'
);
reset role; select tests.clear_claims();
select is(
  (select recorded_by from public.stage_entries where note = 'سجّله المدير'),
  '00000000-0000-4000-8000-000000000802'::uuid,
  'the entry keeps who recorded it'
);

-- 25-30: voiding entries -------------------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000802');
select throws_ok(
  $$ select public.void_stage_entry((select id from public.stage_entries where good_qty = 60), 'خطأ في العد') $$,
  'P0001', 'لا يمكن الإلغاء: المرحلة التالية سجّلت كمية أكبر مما سيبقى',
  'a void that would starve the next stage is refused'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000804');
select lives_ok(
  $$ select public.record_stage_entry((select id from tests.o_ids where name = 'os1'), 5, 0, null, 'عدّ خاطئ') $$,
  'another entry'
);
select throws_ok(
  $$ select public.void_stage_entry((select id from public.stage_entries where note = 'عدّ خاطئ'), 'خطأ') $$,
  '42501', null,
  'a worker cannot void entries'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000802');
select throws_ok(
  $$ select public.void_stage_entry((select id from public.stage_entries where note = 'عدّ خاطئ'), '') $$,
  'P0001', 'اكتب سبب الإلغاء',
  'a void needs a reason'
);
select lives_ok(
  $$ select public.void_stage_entry((select id from public.stage_entries where note = 'عدّ خاطئ'), 'عدّ مكرر') $$,
  'the manager voids an entry with a reason'
);
select throws_ok(
  $$ select public.void_stage_entry((select id from public.stage_entries where note = 'عدّ خاطئ'), 'مرة ثانية') $$,
  'P0001', 'الإدخال ملغى مسبقاً',
  'an entry is voided once'
);
reset role; select tests.clear_claims();
select is(
  (select good_qty from public.order_stages where id = (select id from tests.o_ids where name = 'os1')),
  60.000,
  'voiding takes the quantity back out of the stage'
);

-- 32-33: who sees which entries ---------------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000805');
select is((select count(*)::int from public.stage_entries), 2, 'a worker sees their own entries');
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000802');
select is((select count(*)::int from public.stage_entries), 4, 'the manager sees every entry of the order');

-- 34-39: closing stages and the order -------------------------------------------------
select throws_ok(
  $$ select public.close_order_stage((select id from tests.o_ids where name = 'os2')) $$,
  'P0001', 'أغلق المراحل السابقة أولاً',
  'stages close in order'
);
select lives_ok(
  $$ select public.close_order_stage((select id from tests.o_ids where name = 'os1')) $$,
  'the manager closes the first stage'
);
select throws_ok(
  $$ select public.void_stage_entry((select id from public.stage_entries where good_qty = 60), 'خطأ في العد') $$,
  'P0001', 'المرحلة مغلقة، فلا تُلغى إدخالاتها',
  'entries of a closed stage cannot be voided'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000804');
select throws_ok(
  $$ select public.record_stage_entry((select id from tests.o_ids where name = 'os1'), 1) $$,
  'P0001', 'المرحلة مغلقة',
  'a closed stage takes no entries'
);
select lives_ok(
  $$ select public.record_stage_entry((select id from tests.o_ids where name = 'os3'), 55, 3, (select id from tests.o_ids where name = 'wrap')) $$,
  'the last stage packs what came through'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000802');
select public.close_order_stage((select id from tests.o_ids where name = 'os2'));
select lives_ok(
  $$ select public.close_order_stage((select id from tests.o_ids where name = 'os3')) $$,
  'closing the last stage'
);
reset role; select tests.clear_claims();
select is(
  (select status::text from public.production_orders where id = (select id from tests.o_ids where name = 'order')),
  'completed',
  'closing the last stage completes the order'
);

-- 41-42: cancelling an order ------------------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000802');
select public.create_production_order((select id from tests.o_ids where name = 'product'), 20, null, 'أمر للإلغاء');
select throws_ok(
  $$ select public.cancel_production_order((select id from public.production_orders where notes = 'أمر للإلغاء'), 'لا') $$,
  'P0001', 'اكتب سبب الإلغاء',
  'cancelling needs a reason'
);
select lives_ok(
  $$ select public.cancel_production_order((select id from public.production_orders where notes = 'أمر للإلغاء'), 'ألغى العميل الطلب') $$,
  'the manager cancels an order'
);
reset role; select tests.clear_claims();

-- 43-44: no way around the functions ----------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000804');
select throws_ok(
  $$ insert into public.stage_entries (order_stage_id, worker_id, good_qty, recorded_by)
     values ((select id from tests.o_ids where name = 'os3'), '00000000-0000-4000-8000-000000000804', 1000, '00000000-0000-4000-8000-000000000804') $$,
  '42501', null,
  'workers cannot write entries directly'
);
reset role; select tests.clear_claims();
select ok(
  (select count(*) from audit.log
    where table_name = 'public.stage_entries'
      and record_id = (select id::text from public.stage_entries where note = 'عدّ خاطئ')) >= 2,
  'entries and their voids are audited'
);

select * from finish();
rollback;
