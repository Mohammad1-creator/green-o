-- Phase 2: notifications, device subscriptions and push dispatch.
begin;
select plan(22);

insert into public.departments (id, name) values
  ('00000000-0000-4000-8000-0000000002d1', 'اختبار: قسم الإشعارات');

do $$
begin
  perform tests.create_user('00000000-0000-4000-8000-000000000201', 'employee', '00000000-0000-4000-8000-0000000002d1');
  perform tests.create_user('00000000-0000-4000-8000-000000000202', 'employee', '00000000-0000-4000-8000-0000000002d1');
  perform tests.create_user('00000000-0000-4000-8000-000000000203', 'employee', '00000000-0000-4000-8000-0000000002d1', false);
end $$;

-- 1-2: wiring ---------------------------------------------------------------------
select ok(
  exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notifications'),
  'notifications are published to Realtime'
);
select ok(
  exists (select 1 from cron.job where jobname = 'green-o-retry-pushes'),
  'the push retry job is scheduled'
);

-- 3-8: reading and marking notifications ---------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000201');
select lives_ok($$ select public.send_test_notification() $$, 'a user sends themselves a test notification');
select lives_ok($$ select public.send_test_notification() $$, 'and another one');
select is((select count(*)::int from public.notifications), 2, 'a user sees their own notifications');

select throws_ok(
  $$ insert into public.notifications (user_id, type, title) values ('00000000-0000-4000-8000-000000000201', 'x', 'مزيف') $$,
  '42501', null,
  'notifications cannot be inserted directly'
);
select throws_ok(
  $$ update public.notifications set title = 'معدل' $$,
  '42501', null,
  'only read_at can be changed'
);
select is(
  (select count(*)::int from public.notifications where push_status = 'skipped'),
  2,
  'a user without devices gets no push attempts'
);

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000202');
select is((select count(*)::int from public.notifications), 0, 'nobody sees another user''s notifications');
update public.notifications set read_at = now();
reset role; select tests.clear_claims();
select is(
  (select count(*)::int from public.notifications
    where user_id = '00000000-0000-4000-8000-000000000201' and read_at is null),
  2,
  'nobody can mark another user''s notifications as read'
);

select tests.authenticate_as('00000000-0000-4000-8000-000000000201');
select is((select public.mark_all_notifications_read()), 2, 'mark all as read reports the count');
select is((select count(*)::int from public.notifications where read_at is null), 0, 'and every notification is read');

-- 13-16: device subscriptions ------------------------------------------------------
select lives_ok(
  $$ select public.register_push_subscription('https://push.example.test/device-1', 'p256dh-key', 'auth-key', 'test agent') $$,
  'a user registers a device'
);
select throws_ok(
  $$ select public.register_push_subscription('http://push.example.test/insecure', 'p', 'a') $$,
  '23514', null,
  'device endpoints must use https'
);

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000202');
select lives_ok(
  $$ select public.register_push_subscription('https://push.example.test/device-1', 'p256dh-key-2', 'auth-key-2') $$,
  'a second user signs in on the same device'
);
select is((select count(*)::int from public.push_subscriptions), 1, 'the device now belongs to the second user');

reset role; select tests.clear_claims();
select is(
  (select count(*)::int from public.push_subscriptions where user_id = '00000000-0000-4000-8000-000000000201'),
  0,
  'the first user no longer receives pushes on that device'
);

-- 18-19: dispatch functions are for the server only -------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000202');
select lives_ok($$ select public.send_test_notification() $$, 'the second user gets a notification');
select throws_ok(
  $$ select * from public.claim_push_batch(array(select id from public.notifications)) $$,
  '42501', null,
  'users cannot claim push batches'
);

-- 20-21: claiming a batch never double-sends -----------------------------------------
reset role; select tests.clear_claims();
set local role service_role;
select is(
  (select count(*)::int from public.claim_push_batch(array(
    select id from public.notifications where user_id = '00000000-0000-4000-8000-000000000202'))),
  1,
  'the server claims the pending notification'
);
select is(
  (select count(*)::int from public.claim_push_batch(array(
    select id from public.notifications where user_id = '00000000-0000-4000-8000-000000000202'))),
  0,
  'a second claim of the same notification gets nothing'
);
reset role;

-- 22: with dispatch configured, a new notification queues one HTTP request -------------
select public.configure_push_dispatch('https://app.example.test/api/push/dispatch', repeat('s', 40));
create temporary table queued_before as select count(*) as n from net.http_request_queue;
select tests.authenticate_as('00000000-0000-4000-8000-000000000202');
do $$ begin perform public.send_test_notification(); end $$;
reset role; select tests.clear_claims();
select is(
  (select count(*) from net.http_request_queue) - (select n from queued_before),
  1::bigint,
  'the database asks the app to send the push'
);

select * from finish();
rollback;
