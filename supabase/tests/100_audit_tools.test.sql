-- Phase 11: browsing the audit log, and catching tampering with the chain.
begin;
select plan(13);

-- Fixtures: GM 1001 · maintenance manager 1002 (d1)
insert into public.departments (id, name) values
  ('00000000-0000-4000-8000-00000000a0d1', 'اختبار: الصيانة م11');
do $$
begin
  perform tests.create_user('00000000-0000-4000-8000-000000001001', 'general_manager', null);
  perform tests.create_user('00000000-0000-4000-8000-000000001002', 'maintenance_manager', '00000000-0000-4000-8000-00000000a0d1');
end $$;

-- A few audited changes by the general manager.
select tests.authenticate_as('00000000-0000-4000-8000-000000001001');
insert into public.departments (name) values ('اختبار م11: قسم أ'), ('اختبار م11: قسم ب'), ('اختبار م11: قسم ج');
reset role; select tests.clear_claims();

-- 1-5: browsing -----------------------------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000001001');
select is(
  (select count(*)::int from public.list_audit_log(
     p_actor_id => '00000000-0000-4000-8000-000000001001', p_table => 'public.departments', p_action => 'insert')),
  3,
  'the general manager filters the log by person, table and action'
);
select ok(
  (select actor_name is not null and new_data ? 'name'
     from public.list_audit_log(p_table => 'public.departments', p_limit => 1)),
  'entries carry the person''s name and the values'
);
select is(
  (select count(*)::int from public.list_audit_log(
     p_table => 'public.departments',
     p_before_id => (select max(id) from public.list_audit_log(p_table => 'public.departments')))),
  (select count(*)::int - 1 from public.list_audit_log(p_table => 'public.departments')),
  'paging continues below the last id seen'
);
select ok(
  exists (select 1 from public.audit_tables() where table_name = 'public.departments'),
  'the table list feeds the filter'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001002');
select throws_ok(
  $$ select * from public.list_audit_log() $$,
  '42501', 'سجل التدقيق للمدير العام فقط',
  'other managers cannot read the log'
);
reset role; select tests.clear_claims();

-- 6-7: an untouched chain checks out ------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000001001');
select is(
  (select ok from public.run_audit_chain_check()),
  true,
  'the chain is intact'
);
select is(
  (select ok from public.audit_chain_status()),
  true,
  'the latest check is kept'
);
reset role; select tests.clear_claims();

-- 8-10: an edited row is caught ----------------------------------------------------
create table tests.tampered as
  select id, new_data from audit.log
   where table_name = 'public.departments' and new_data ->> 'name' = 'اختبار م11: قسم ب';
grant select on tests.tampered to authenticated;
alter table audit.log disable trigger log_immutable;
update audit.log set new_data = jsonb_set(new_data, '{name}', '"قسم مزوّر"')
 where id = (select id from tests.tampered);
alter table audit.log enable trigger log_immutable;

select tests.authenticate_as('00000000-0000-4000-8000-000000001001');
select is(
  (select concat_ws(',', ok::text, (first_bad_id = (select id from tests.tampered))::text, problem)
     from public.run_audit_chain_check()),
  'false,true,بصمة السطر لا تطابق محتواه',
  'an edited row no longer matches its hash'
);
reset role; select tests.clear_claims();
select is(
  (select count(*)::int from public.notifications
    where user_id = '00000000-0000-4000-8000-000000001001' and type = 'audit_chain_broken'),
  1,
  'the general manager is alerted'
);

-- Put it back: the chain checks out again.
alter table audit.log disable trigger log_immutable;
update audit.log set new_data = (select new_data from tests.tampered) where id = (select id from tests.tampered);
alter table audit.log enable trigger log_immutable;
select is(
  (select ok from audit.verify_chain()),
  true,
  'the restored row matches again'
);

-- 11: a deleted row is caught at the row after it ---------------------------------
create table tests.next_row as
  select min(id) as id from audit.log where id > (select id from tests.tampered);
alter table audit.log disable trigger log_immutable;
delete from audit.log where id = (select id from tests.tampered);
alter table audit.log enable trigger log_immutable;
select is(
  (select concat_ws(',', ok::text, (first_bad_id = (select id from tests.next_row))::text, problem) from audit.verify_chain()),
  'false,true,السطر لا يشير إلى بصمة السطر الذي قبله',
  'a removed row breaks the link of the row after it'
);

-- 12-13: the checks themselves are permanent, and run every day -----------------------
select throws_ok(
  $$ update audit.chain_checks set ok = true $$,
  '42501', null,
  'past check results cannot be rewritten'
);
select is(
  (select count(*)::int from cron.job where jobname = 'green-o-audit-chain'),
  1,
  'the daily chain check is scheduled'
);

select * from finish();
rollback;
