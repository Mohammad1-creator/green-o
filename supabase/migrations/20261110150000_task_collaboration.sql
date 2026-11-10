-- Phase 5: comments, photos and reminders on tasks.

-- -----------------------------------------------------------------------------
-- Comments
-- -----------------------------------------------------------------------------
create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  body text not null
    constraint task_comments_body_length check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index task_comments_task_idx on public.task_comments (task_id, created_at);

alter table public.task_comments enable row level security;
grant select on public.task_comments to authenticated;

create policy task_comments_read on public.task_comments
  for select to authenticated
  using (private.can_view_task(task_id));

create function public.add_task_comment(p_task_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_body text := btrim(coalesce(p_body, ''));
  v_id uuid;
  v_task public.tasks;
  v_author text := private.my_name();
begin
  if not private.can_view_task(p_task_id) then
    raise exception 'ليست لديك صلاحية للتعليق على هذه المهمة' using errcode = '42501';
  end if;
  if char_length(v_body) = 0 then
    raise exception 'اكتب التعليق' using errcode = 'P0001';
  end if;
  select * into v_task from public.tasks where id = p_task_id;

  insert into public.task_comments (task_id, author_id, body)
  values (p_task_id, auth.uid(), left(v_body, 2000))
  returning id into v_id;

  perform private.notify_task_assignees(
    p_task_id, 'task_comment', 'تعليق جديد على: ' || v_task.title, v_author || ': ' || left(v_body, 200)
  );
  if v_task.created_by is distinct from auth.uid()
     and not exists (
       select 1 from public.task_assignees where task_id = p_task_id and user_id = v_task.created_by
     ) then
    perform private.notify(
      v_task.created_by, 'task_comment', 'تعليق جديد على: ' || v_task.title,
      v_author || ': ' || left(v_body, 200), '/admin/tasks/' || p_task_id
    );
  end if;
  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Photos. Files live in the private "attachments" bucket under
-- tasks/<task id>/<file>; access follows access to the task.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create function private.try_uuid(p_value text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p_value::uuid;
exception when others then
  return null;
end;
$$;

-- Who may read, add or delete a file, decided by the folder it sits in.
create function private.attachment_access(p_name text, p_action text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_folders text[] := storage.foldername(p_name);
  v_owner uuid := private.try_uuid(v_folders[2]);
begin
  if v_owner is null or p_name like '%..%' then
    return false;
  end if;
  if v_folders[1] = 'tasks' then
    return case p_action
      when 'read' then private.can_view_task(v_owner)
      when 'upload' then private.can_view_task(v_owner) and exists (
        select 1 from public.tasks where id = v_owner and status not in ('completed', 'cancelled')
      )
      when 'delete' then private.can_manage_task(v_owner)
      else false
    end;
  end if;
  return false;
end;
$$;

create policy attachments_read on storage.objects
  for select to authenticated
  using (bucket_id = 'attachments' and private.attachment_access(name, 'read'));

create policy attachments_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments' and private.attachment_access(name, 'upload'));

create policy attachments_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'attachments' and private.attachment_access(name, 'delete'));

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null
    constraint attachments_path_length check (char_length(storage_path) <= 300),
  mime_type text not null
    constraint attachments_mime_type check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null
    constraint attachments_size check (size_bytes > 0 and size_bytes <= 10485760),
  uploaded_by uuid not null references public.profiles (id),
  task_id uuid references public.tasks (id) on delete cascade,
  comment_id uuid references public.task_comments (id) on delete cascade,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id),
  constraint attachments_has_parent check (task_id is not null),
  constraint attachments_comment_needs_task check (comment_id is null or task_id is not null)
);

create unique index attachments_path_unique on public.attachments (storage_path);
create index attachments_task_idx on public.attachments (task_id) where deleted_at is null;

alter table public.attachments enable row level security;
grant select on public.attachments to authenticated;

create policy attachments_rows_read on public.attachments
  for select to authenticated
  using (deleted_at is null and task_id is not null and private.can_view_task(task_id));

create trigger audit_attachments
  after insert or update on public.attachments
  for each row execute function audit.log_change('id');

-- Called after the browser uploads the file: records it on the task.
create function public.register_task_attachment(
  p_task_id uuid,
  p_path text,
  p_mime_type text,
  p_size_bytes integer,
  p_comment_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not private.can_view_task(p_task_id) then
    raise exception 'ليست لديك صلاحية لإرفاق صور بهذه المهمة' using errcode = '42501';
  end if;
  if exists (select 1 from public.tasks where id = p_task_id and status in ('completed', 'cancelled')) then
    raise exception 'لا يمكن إرفاق صور بمهمة منتهية' using errcode = 'P0001';
  end if;
  if p_path not like 'tasks/' || p_task_id || '/%' or p_path like '%..%' then
    raise exception 'مسار الملف لا يخص هذه المهمة' using errcode = 'P0001';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'attachments' and name = p_path) then
    raise exception 'لم يُرفع الملف' using errcode = 'P0001';
  end if;
  if p_comment_id is not null
     and not exists (select 1 from public.task_comments where id = p_comment_id and task_id = p_task_id) then
    raise exception 'التعليق لا يخص هذه المهمة' using errcode = 'P0001';
  end if;

  insert into public.attachments (storage_path, mime_type, size_bytes, uploaded_by, task_id, comment_id)
  values (p_path, p_mime_type, p_size_bytes, auth.uid(), p_task_id, p_comment_id)
  returning id into v_id;

  perform private.log_task_event(p_task_id, 'attachment');
  return v_id;
end;
$$;

-- Hides a photo and returns its path, so the server can remove the file.
-- Only the task's manager may delete; the deletion is in the audit log.
create function public.mark_attachment_deleted(p_attachment_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.attachments;
begin
  select * into v_row from public.attachments where id = p_attachment_id and deleted_at is null for update;
  if not found then
    raise exception 'الصورة غير موجودة' using errcode = 'P0002';
  end if;
  if v_row.task_id is null or not private.can_manage_task(v_row.task_id) then
    raise exception 'حذف الصور لمدير القسم' using errcode = '42501';
  end if;

  update public.attachments set deleted_at = now(), deleted_by = auth.uid() where id = p_attachment_id;
  return v_row.storage_path;
end;
$$;

-- -----------------------------------------------------------------------------
-- Reminders, sent by a pg_cron job every minute.
-- -----------------------------------------------------------------------------
create table public.task_reminders (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  remind_at timestamptz not null,
  sent_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index task_reminders_due_idx on public.task_reminders (remind_at) where sent_at is null;

alter table public.task_reminders enable row level security;
grant select on public.task_reminders to authenticated;

create policy task_reminders_read on public.task_reminders
  for select to authenticated
  using (private.can_manage_task(task_id));

create function public.add_task_reminder(p_task_id uuid, p_remind_at timestamptz)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not private.can_manage_task(p_task_id) then
    raise exception 'التذكيرات لمدير القسم' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.tasks where id = p_task_id and status in ('new', 'received', 'in_progress', 'needs_follow_up')
  ) then
    raise exception 'التذكير للمهام المفتوحة فقط' using errcode = 'P0001';
  end if;
  if p_remind_at is null or p_remind_at <= now() then
    raise exception 'اختر وقتاً قادماً للتذكير' using errcode = 'P0001';
  end if;
  if (select count(*) from public.task_reminders where task_id = p_task_id and sent_at is null) >= 10 then
    raise exception 'لا يمكن إضافة أكثر من 10 تذكيرات للمهمة' using errcode = 'P0001';
  end if;

  insert into public.task_reminders (task_id, remind_at, created_by)
  values (p_task_id, p_remind_at, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create function public.delete_task_reminder(p_reminder_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task uuid;
begin
  select task_id into v_task from public.task_reminders where id = p_reminder_id and sent_at is null;
  if v_task is null then
    raise exception 'التذكير غير موجود أو أُرسل' using errcode = 'P0002';
  end if;
  if not private.can_manage_task(v_task) then
    raise exception 'التذكيرات لمدير القسم' using errcode = '42501';
  end if;
  delete from public.task_reminders where id = p_reminder_id;
end;
$$;

-- Sends every due reminder once. Tasks already handed in or finished get none.
create function private.dispatch_due_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_sent integer := 0;
  v_zone text := private.factory_timezone();
begin
  for r in
    select tr.id, t.id as task_id, t.title, t.status, t.due_at
      from public.task_reminders tr
      join public.tasks t on t.id = tr.task_id
     where tr.sent_at is null and tr.remind_at <= now()
     order by tr.remind_at
     for update of tr skip locked
  loop
    update public.task_reminders set sent_at = now() where id = r.id;
    if r.status in ('new', 'received', 'in_progress', 'needs_follow_up') then
      perform private.notify_task_assignees(
        r.task_id,
        'task_reminder',
        'تذكير: ' || r.title,
        case when r.due_at is null then 'المهمة ما زالت مفتوحة'
             else 'الاستحقاق ' || to_char(r.due_at at time zone v_zone, 'YYYY-MM-DD HH24:MI') end
      );
      perform private.log_task_event(r.task_id, 'reminder');
      v_sent := v_sent + 1;
    end if;
  end loop;
  return v_sent;
end;
$$;

select cron.schedule('green-o-task-reminders', '* * * * *', $$select private.dispatch_due_reminders()$$);

-- -----------------------------------------------------------------------------
-- Privileges
-- -----------------------------------------------------------------------------
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;

grant execute on function
  private.try_uuid(text),
  private.attachment_access(text, text)
to authenticated;

grant execute on function
  public.add_task_comment(uuid, text),
  public.register_task_attachment(uuid, text, text, integer, uuid),
  public.mark_attachment_deleted(uuid),
  public.add_task_reminder(uuid, timestamptz),
  public.delete_task_reminder(uuid)
to authenticated;
