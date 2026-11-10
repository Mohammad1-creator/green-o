-- Phase 5: comments, photos (storage policies) and reminders.
begin;
select plan(26);

-- Fixtures: maintenance manager 402 and technicians 404, 405 in d1; worker 406 in d2.
insert into public.departments (id, name) values
  ('00000000-0000-4000-8000-0000000004d1', 'اختبار: صيانة التعاون'),
  ('00000000-0000-4000-8000-0000000004d2', 'اختبار: إنتاج التعاون');

do $$
begin
  perform tests.create_user('00000000-0000-4000-8000-000000000402', 'maintenance_manager', '00000000-0000-4000-8000-0000000004d1');
  perform tests.create_user('00000000-0000-4000-8000-000000000404', 'employee', '00000000-0000-4000-8000-0000000004d1');
  perform tests.create_user('00000000-0000-4000-8000-000000000406', 'employee', '00000000-0000-4000-8000-0000000004d2');
end $$;

create table tests.collab_ids (name text primary key, id uuid not null);
grant select on tests.collab_ids to authenticated;

select tests.authenticate_as('00000000-0000-4000-8000-000000000402');
do $$
begin
  perform public.create_task('اختبار: مهمة التعاون', null, null, null,
    array['00000000-0000-4000-8000-000000000404']::uuid[], null);
end $$;
reset role; select tests.clear_claims();
insert into tests.collab_ids select 'task', id from public.tasks where title = 'اختبار: مهمة التعاون';

-- 1-6: comments ----------------------------------------------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000404');
select lives_ok(
  $$ select public.add_task_comment((select id from tests.collab_ids where name = 'task'), 'وصلت القطعة البديلة') $$,
  'the assignee comments'
);
select throws_ok(
  $$ select public.add_task_comment((select id from tests.collab_ids where name = 'task'), '   ') $$,
  'P0001', null,
  'an empty comment is rejected'
);

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000406');
select throws_ok(
  $$ select public.add_task_comment((select id from tests.collab_ids where name = 'task'), 'تطفل') $$,
  '42501', null,
  'staff of another department cannot comment'
);
select is((select count(*)::int from public.task_comments), 0, 'and cannot read the comments');

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000402');
select is((select count(*)::int from public.task_comments), 1, 'the manager reads the comment');
reset role; select tests.clear_claims();
select is(
  (select count(*)::int from public.notifications
    where user_id = '00000000-0000-4000-8000-000000000402' and type = 'task_comment'),
  1,
  'the task''s creator is notified of the comment'
);

-- 7-9: storage policies follow access to the task -----------------------------------
select tests.authenticate_as('00000000-0000-4000-8000-000000000404');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('attachments', 'tasks/' || (select id from tests.collab_ids where name = 'task') || '/pump.jpg') $$,
  'the assignee uploads a photo to the task''s folder'
);

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000406');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('attachments', 'tasks/' || (select id from tests.collab_ids where name = 'task') || '/intruder.jpg') $$,
  '42501', null,
  'others cannot upload to it'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'attachments' and name like 'tasks/%/pump.jpg'),
  0,
  'or see its files'
);

-- 10-14: recording photos ----------------------------------------------------------
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000404');
select lives_ok(
  $$ select public.register_task_attachment(
       (select id from tests.collab_ids where name = 'task'),
       'tasks/' || (select id from tests.collab_ids where name = 'task') || '/pump.jpg',
       'image/jpeg', 120000) $$,
  'the uploaded photo is recorded on the task'
);
select throws_ok(
  $$ select public.register_task_attachment(
       (select id from tests.collab_ids where name = 'task'),
       'tasks/' || (select id from tests.collab_ids where name = 'task') || '/missing.jpg',
       'image/jpeg', 1000) $$,
  'P0001', null,
  'a file that was never uploaded cannot be recorded'
);
select throws_ok(
  $$ select public.register_task_attachment(
       (select id from tests.collab_ids where name = 'task'),
       'tasks/00000000-0000-4000-8000-00000000ffff/pump.jpg', 'image/jpeg', 1000) $$,
  'P0001', null,
  'a path from another task is rejected'
);
select is((select count(*)::int from public.attachments), 1, 'the assignee sees the photo');

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000406');
select is((select count(*)::int from public.attachments), 0, 'others do not');

-- 15-17: deleting photos -----------------------------------------------------------
reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000404');
select throws_ok(
  $$ select public.mark_attachment_deleted((select id from public.attachments limit 1)) $$,
  '42501', null,
  'an employee cannot delete photos'
);

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000402');
select is(
  (select public.mark_attachment_deleted((select id from public.attachments limit 1))),
  'tasks/' || (select id from tests.collab_ids where name = 'task') || '/pump.jpg',
  'the manager deletes a photo and gets its path back'
);
select is((select count(*)::int from public.attachments), 0, 'a deleted photo disappears from the task');

-- 18-22: reminders -------------------------------------------------------------------
select lives_ok(
  $$ select public.add_task_reminder((select id from tests.collab_ids where name = 'task'), now() + interval '1 hour') $$,
  'the manager adds a reminder'
);
select throws_ok(
  $$ select public.add_task_reminder((select id from tests.collab_ids where name = 'task'), now() - interval '1 hour') $$,
  'P0001', null,
  'a reminder in the past is rejected'
);
select is((select count(*)::int from public.task_reminders), 1, 'the manager sees the reminder');

reset role; select tests.clear_claims();
select tests.authenticate_as('00000000-0000-4000-8000-000000000404');
select throws_ok(
  $$ select public.add_task_reminder((select id from tests.collab_ids where name = 'task'), now() + interval '1 hour') $$,
  '42501', null,
  'an employee cannot add reminders'
);
select is((select count(*)::int from public.task_reminders), 0, 'nor see them');

-- 23-26: sending reminders ---------------------------------------------------------
reset role; select tests.clear_claims();
update public.task_reminders set remind_at = now() - interval '1 minute';
select is((select private.dispatch_due_reminders()), 1, 'a due reminder is sent');
select is((select private.dispatch_due_reminders()), 0, 'and never sent twice');
select is(
  (select count(*)::int from public.notifications
    where user_id = '00000000-0000-4000-8000-000000000404' and type = 'task_reminder'),
  1,
  'the assignee receives it'
);
select ok(
  exists (select 1 from cron.job where jobname = 'green-o-task-reminders'),
  'the reminder job runs every minute'
);

select * from finish();
rollback;
