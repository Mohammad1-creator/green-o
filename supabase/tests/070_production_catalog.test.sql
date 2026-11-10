-- Phase 8: specifications, products, stages, routes and defect types.
begin;
select plan(41);

-- Fixtures: GM 701 · production manager 702 (d2) · maintenance manager 703 (d1)
-- worker 704 (d2)
insert into public.departments (id, name) values
  ('00000000-0000-4000-8000-0000000007d1', 'اختبار: الصيانة م8'),
  ('00000000-0000-4000-8000-0000000007d2', 'اختبار: الإنتاج م8');

do $$
begin
  perform tests.create_user('00000000-0000-4000-8000-000000000701', 'general_manager', null);
  perform tests.create_user('00000000-0000-4000-8000-000000000702', 'production_manager', '00000000-0000-4000-8000-0000000007d2');
  perform tests.create_user('00000000-0000-4000-8000-000000000703', 'maintenance_manager', '00000000-0000-4000-8000-0000000007d1');
  perform tests.create_user('00000000-0000-4000-8000-000000000704', 'employee', '00000000-0000-4000-8000-0000000007d2');
end $$;

create table tests.p_ids (name text primary key, id uuid not null);
grant select on tests.p_ids to authenticated;

-- 1: every catalog table has row level security -----------------------------------
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('spec_definitions', 'products', 'stages', 'product_route_steps', 'defect_types')
      and c.relrowsecurity),
  5,
  'all five catalog tables have row level security'
);

-- 2-9: specification definitions -------------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000702');
select lives_ok(
  $$ insert into public.spec_definitions (label, data_type, unit, min_value, max_value, sort_order)
     values ('اختبار: السماكة', 'number', ' مم ', 1, 50, 1) $$,
  'the production manager defines a number specification'
);
select lives_ok(
  $$ insert into public.spec_definitions (label, data_type, options, sort_order)
     values ('اختبار: اللون', 'select', array[' أبيض ', 'رمادي', ''], 2) $$,
  'a list specification with its options'
);
select lives_ok(
  $$ insert into public.spec_definitions (label, data_type, sort_order)
     values ('اختبار: مقاوم للماء', 'boolean', 3), ('اختبار: ملاحظة', 'text', 4) $$,
  'yes/no and text specifications'
);
select throws_ok(
  $$ insert into public.spec_definitions (label, data_type, options) values ('اختبار: فارغة', 'select', array['  ']) $$,
  'P0001', 'أضف خياراً واحداً على الأقل',
  'a list needs at least one option'
);
select throws_ok(
  $$ insert into public.spec_definitions (label, data_type, min_value, max_value) values ('اختبار: حدود', 'number', 9, 3) $$,
  'P0001', 'الحد الأدنى أكبر من الحد الأعلى',
  'the lower limit cannot exceed the upper one'
);
select throws_ok(
  $$ insert into public.spec_definitions (label, data_type) values ('اختبار: السماكة', 'text') $$,
  '23505', null,
  'labels are unique'
);
reset role; select tests.clear_claims();
insert into tests.p_ids select 'thickness', id from public.spec_definitions where label = 'اختبار: السماكة';
insert into tests.p_ids select 'color', id from public.spec_definitions where label = 'اختبار: اللون';
insert into tests.p_ids select 'waterproof', id from public.spec_definitions where label = 'اختبار: مقاوم للماء';
insert into tests.p_ids select 'note', id from public.spec_definitions where label = 'اختبار: ملاحظة';

select is(
  (select options from public.spec_definitions where label = 'اختبار: اللون'),
  array['أبيض', 'رمادي'],
  'options are trimmed and empty ones dropped'
);

select tests.authenticate_as('00000000-0000-4000-8000-000000000703');
select throws_ok(
  $$ insert into public.spec_definitions (label, data_type) values ('اختبار: صيانة', 'text') $$,
  '42501', null,
  'the maintenance manager cannot define specifications'
);
reset role; select tests.clear_claims();

-- 10-19: products and their values --------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000704');
select is(
  (select count(*)::int from public.spec_definitions where label like 'اختبار:%'),
  4,
  'a worker reads the specifications'
);
select throws_ok(
  $$ insert into public.products (code, name, unit) values ('T-X', 'اختبار', 'قطعة') $$,
  '42501', null,
  'a worker cannot add products'
);
reset role; select tests.clear_claims();

select tests.authenticate_as('00000000-0000-4000-8000-000000000702');
select lives_ok(
  $$ insert into public.products (code, name, unit, specs) values ('T-P1', 'اختبار: لوح', 'لوح', jsonb_build_object(
       (select id::text from tests.p_ids where name = 'thickness'), 18,
       (select id::text from tests.p_ids where name = 'color'), 'أبيض',
       (select id::text from tests.p_ids where name = 'waterproof'), true,
       (select id::text from tests.p_ids where name = 'note'), '  ملاحظة  ')) $$,
  'a product with a value for each specification'
);
select lives_ok(
  $$ insert into public.products (code, name, unit, specs) values
       ('T-P2', 'اختبار: لوح 2', 'لوح', jsonb_build_object(
          (select id::text from tests.p_ids where name = 'thickness'), 12.5,
          (select id::text from tests.p_ids where name = 'note'), '')),
       ('T-P3', 'اختبار: لوح 3', 'لوح', jsonb_build_object(
          (select id::text from tests.p_ids where name = 'color'), 'أبيض')) $$,
  'products with some values left empty'
);
select is(
  (select specs ->> (select id::text from tests.p_ids where name = 'note') from public.products where code = 'T-P1'),
  'ملاحظة',
  'text values are trimmed'
);
select ok(
  not (select specs ? (select id::text from tests.p_ids where name = 'note') from public.products where code = 'T-P2'),
  'an empty value is not stored'
);
select throws_ok(
  $$ insert into public.products (code, name, unit, specs) values ('T-X1', 'اختبار', 'لوح',
       jsonb_build_object((select id::text from tests.p_ids where name = 'thickness'), 'ثمانية عشر')) $$,
  '22023', '«اختبار: السماكة» يجب أن تكون رقماً',
  'text in a number specification is refused'
);
select throws_ok(
  $$ insert into public.products (code, name, unit, specs) values ('T-X2', 'اختبار', 'لوح',
       jsonb_build_object((select id::text from tests.p_ids where name = 'thickness'), 60)) $$,
  '22023', '«اختبار: السماكة» لا تزيد على 50',
  'a number above the limit is refused'
);
select throws_ok(
  $$ insert into public.products (code, name, unit, specs) values ('T-X3', 'اختبار', 'لوح',
       jsonb_build_object((select id::text from tests.p_ids where name = 'color'), 'أخضر')) $$,
  '22023', 'اختر قيمة «اختبار: اللون» من القائمة',
  'a value outside the list is refused'
);
select throws_ok(
  $$ insert into public.products (code, name, unit, specs) values ('T-X4', 'اختبار', 'لوح',
       jsonb_build_object((select id::text from tests.p_ids where name = 'waterproof'), 'true')) $$,
  '22023', '«اختبار: مقاوم للماء» يجب أن تكون نعم أو لا',
  'yes/no values must be booleans'
);
select throws_ok(
  $$ insert into public.products (code, name, unit, specs) values ('T-X5', 'اختبار', 'لوح',
       '{"00000000-0000-4000-8000-00000000dead": 1}'::jsonb) $$,
  '22023', 'مواصفة غير معروفة',
  'an unknown specification is refused'
);

-- 20-26: changing a specification that products already use ---------------------------
select lives_ok(
  $$ update public.spec_definitions set is_required = true where label = 'اختبار: السماكة' $$,
  'a specification becomes required'
);
select throws_ok(
  $$ insert into public.products (code, name, unit) values ('T-X6', 'اختبار', 'لوح') $$,
  '22023', 'المواصفة «اختبار: السماكة» مطلوبة',
  'a new product needs the required value'
);
select lives_ok(
  $$ update public.products set is_active = false where code = 'T-P3' $$,
  'an older product without it can still be deactivated'
);
select throws_ok(
  $$ update public.products set specs = specs where code = 'T-P3' $$,
  '22023', 'المواصفة «اختبار: السماكة» مطلوبة',
  'but editing its values asks for the required one'
);
select throws_ok(
  $$ update public.spec_definitions set data_type = 'text' where label = 'اختبار: اللون' $$,
  'P0001', 'لا يمكن تغيير نوع مواصفة مستخدمة في منتجات',
  'the type of a specification in use cannot change'
);
select throws_ok(
  $$ update public.spec_definitions set options = array['رمادي'] where label = 'اختبار: اللون' $$,
  'P0001', 'الخيار «أبيض» مستخدم في منتجات، فلا يمكن حذفه',
  'an option in use cannot be removed'
);
select throws_ok(
  $$ update public.spec_definitions set max_value = 10 where label = 'اختبار: السماكة' $$,
  'P0001', 'توجد منتجات قيمها خارج الحدود الجديدة. عدّلها أولاً',
  'limits cannot exclude values already in use'
);
select lives_ok(
  $$ update public.spec_definitions set max_value = 60 where label = 'اختبار: السماكة' $$,
  'limits can widen'
);
reset role; select tests.clear_claims();
insert into tests.p_ids select 'p1', id from public.products where code = 'T-P1';

select tests.authenticate_as('00000000-0000-4000-8000-000000000703');
update public.products set name = 'تغيير' where code = 'T-P1';
reset role; select tests.clear_claims();
select is(
  (select name from public.products where code = 'T-P1'),
  'اختبار: لوح',
  'the maintenance manager cannot edit products'
);

-- 28-35: stages and routes ----------------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000702');
select lives_ok(
  $$ insert into public.stages (name, sort_order) values ('اختبار: قص', 1), ('اختبار: تصفيح', 2), ('اختبار: تغليف', 3) $$,
  'the production manager adds stages'
);
reset role; select tests.clear_claims();
insert into tests.p_ids select 'cut', id from public.stages where name = 'اختبار: قص';
insert into tests.p_ids select 'laminate', id from public.stages where name = 'اختبار: تصفيح';
insert into tests.p_ids select 'pack', id from public.stages where name = 'اختبار: تغليف';

select tests.authenticate_as('00000000-0000-4000-8000-000000000702');
select lives_ok(
  $$ select public.set_product_route((select id from tests.p_ids where name = 'p1'), array[
       (select id from tests.p_ids where name = 'cut'),
       (select id from tests.p_ids where name = 'laminate'),
       (select id from tests.p_ids where name = 'pack')]) $$,
  'the production manager sets a route'
);
select is(
  (select array_agg(stage_id order by seq) from public.product_route_steps
    where product_id = (select id from tests.p_ids where name = 'p1')),
  array[
    (select id from tests.p_ids where name = 'cut'),
    (select id from tests.p_ids where name = 'laminate'),
    (select id from tests.p_ids where name = 'pack')],
  'the route keeps its order'
);
select lives_ok(
  $$ select public.set_product_route((select id from tests.p_ids where name = 'p1'), array[
       (select id from tests.p_ids where name = 'cut'),
       (select id from tests.p_ids where name = 'laminate'),
       (select id from tests.p_ids where name = 'pack')]) $$,
  'setting the same route again is harmless'
);
reset role; select tests.clear_claims();
select is(
  (select count(*)::int from audit.log
    where table_name = 'public.product_route_steps'
      and record_id = (select id::text from tests.p_ids where name = 'p1')),
  1,
  'a route change is one audit entry, and an unchanged route none'
);

select tests.authenticate_as('00000000-0000-4000-8000-000000000702');
select throws_ok(
  $$ select public.set_product_route((select id from tests.p_ids where name = 'p1'), array[
       (select id from tests.p_ids where name = 'cut'),
       (select id from tests.p_ids where name = 'cut')]) $$,
  'P0001', 'لا يمر المنتج بالمرحلة نفسها مرتين',
  'a stage appears once in a route'
);
select throws_ok(
  $$ select public.set_product_route((select id from tests.p_ids where name = 'p1'), array[]::uuid[]) $$,
  'P0001', 'أضف مرحلة واحدة على الأقل',
  'a route has at least one stage'
);
update public.stages set is_active = false where name = 'اختبار: تغليف';
select throws_ok(
  $$ select public.set_product_route((select id from tests.p_ids where name = 'p1'), array[
       (select id from tests.p_ids where name = 'pack')]) $$,
  'P0001', 'إحدى المراحل غير موجودة أو موقوفة',
  'a stopped stage cannot join a route'
);
reset role; select tests.clear_claims();

select tests.authenticate_as('00000000-0000-4000-8000-000000000704');
select throws_ok(
  $$ select public.set_product_route((select id from tests.p_ids where name = 'p1'), array[
       (select id from tests.p_ids where name = 'cut')]) $$,
  '42501', null,
  'a worker cannot change routes'
);
reset role; select tests.clear_claims();

-- 36-38: defect types and the audit trail -----------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000702');
select lives_ok(
  $$ insert into public.defect_types (name, stage_id) values
       ('اختبار: خدش', (select id from tests.p_ids where name = 'cut')),
       ('اختبار: خدش', null) $$,
  'the same defect name for one stage and for all stages'
);
select throws_ok(
  $$ insert into public.defect_types (name, stage_id) values ('اختبار: خدش', null) $$,
  '23505', null,
  'defect names are unique per stage'
);
reset role; select tests.clear_claims();

select is(
  (select count(*)::int from audit.log
    where table_name = 'public.products' and action = 'insert'
      and record_id = (select id::text from tests.p_ids where name = 'p1')
      and actor_id = '00000000-0000-4000-8000-000000000702'),
  1,
  'adding a product is audited with its author'
);

select * from finish();
rollback;
