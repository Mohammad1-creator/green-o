-- Phase 12: backup runs are written by the backup job and read by the GM.
begin;
select plan(10);

-- Fixtures: GM 1101 · maintenance manager 1102 (d1)
insert into public.departments (id, name) values
  ('00000000-0000-4000-8000-00000000b0d1', 'اختبار: الصيانة م12');
do $$
begin
  perform tests.create_user('00000000-0000-4000-8000-000000001101', 'general_manager', null);
  perform tests.create_user('00000000-0000-4000-8000-000000001102', 'maintenance_manager', '00000000-0000-4000-8000-00000000b0d1');
end $$;
update private.environment_marker set env = 'local' where id;

-- 1-2: only the backup job writes ------------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000001101');
select throws_ok(
  $$ select public.record_backup_run('succeeded', now()) $$,
  '42501', null,
  'signed-in users cannot record backups'
);
select throws_ok(
  $$ insert into public.backup_runs (environment, status, started_at) values ('local', 'succeeded', now()) $$,
  '42501', null,
  'or write the table directly'
);
reset role; select tests.clear_claims();

-- 3-6: the backup job records runs --------------------------------------------------
set local role service_role;
select lives_ok(
  $$ select public.record_backup_run('succeeded', now() - interval '20 minutes', 1048576, 2097152, 12,
       (select last_id from public.audit_chain_head()), (select last_hash from public.audit_chain_head()),
       'daily/2026-11-11.tar.gz.age', 'https://github.com/example/actions/runs/1') $$,
  'the backup job records a successful run with the audit anchor'
);
select is(
  (select ok from public.audit_chain_verify()),
  true,
  'the backup job can verify the chain of a restored copy'
);
select lives_ok(
  $$ select public.record_backup_run('failed', now() - interval '5 minutes', p_error => 'pg_dump: connection refused') $$,
  'a failed run is recorded too'
);
reset role;
select is(
  (select count(*)::int from public.notifications
    where user_id = '00000000-0000-4000-8000-000000001101' and type = 'backup_failed'),
  1,
  'a failed run alerts the general manager'
);

-- 7-8: the general manager sees the runs, others do not --------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000001101');
select is(
  (select count(*)::int from public.backup_runs),
  2,
  'the general manager sees every run'
);
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000001102');
select is((select count(*)::int from public.backup_runs), 0, 'other managers see none');
reset role; select tests.clear_claims();

-- 9-10: a stale backup warns, in production only -----------------------------------
delete from public.backup_runs;
select private.check_backup_freshness();
select is(
  (select count(*)::int from public.notifications where type = 'backup_stale'),
  0,
  'outside production there is no staleness warning'
);
update private.environment_marker set env = 'prod' where id;
select private.check_backup_freshness();
select is(
  (select count(*)::int from public.notifications
    where user_id = '00000000-0000-4000-8000-000000001101' and type = 'backup_stale'),
  1,
  'in production, no success for 36 hours warns the general manager'
);

select * from finish();
rollback;
