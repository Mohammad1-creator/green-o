-- Phase 2: in-app notifications and Web Push.
--
-- Every notification is a row in public.notifications. Inserting one asks the
-- app (via pg_net) to send it as a Web Push to the user's devices. The app's
-- address and a shared secret live in Vault, set once per environment:
--   select public.configure_push_dispatch('https://<app>/api/push/dispatch', '<secret>');
-- Without them, notifications still appear in the app; pushes wait, and a
-- pg_cron job retries them every five minutes.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create type public.push_status as enum ('pending', 'sent', 'failed', 'skipped');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null
    constraint notifications_type_length check (char_length(type) between 1 and 50),
  title text not null
    constraint notifications_title_length check (char_length(title) between 1 and 200),
  body text
    constraint notifications_body_length check (body is null or char_length(body) <= 1000),
  url text
    constraint notifications_url_local check (url is null or (url like '/%' and url not like '//%')),
  read_at timestamptz,
  push_status public.push_status not null default 'pending',
  push_attempts smallint not null default 0,
  push_error text,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
create index notifications_push_queue_idx on public.notifications (created_at)
  where push_status in ('pending', 'failed');

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null
    constraint push_subscriptions_endpoint_https
    check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  p256dh text not null
    constraint push_subscriptions_p256dh_length check (char_length(p256dh) between 1 and 200),
  auth text not null
    constraint push_subscriptions_auth_length check (char_length(auth) between 1 and 100),
  user_agent text
    constraint push_subscriptions_user_agent_length check (user_agent is null or char_length(user_agent) <= 500),
  created_at timestamptz not null default now(),
  last_success_at timestamptz
);

create unique index push_subscriptions_endpoint_unique on public.push_subscriptions (endpoint);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- -----------------------------------------------------------------------------
-- Row level security
-- -----------------------------------------------------------------------------
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy notifications_read_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()) and (select private.is_active_user()));

create policy notifications_mark_read_own on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()) and (select private.is_active_user()))
  with check (user_id = (select auth.uid()));

grant select, delete on public.push_subscriptions to authenticated;

create policy push_subscriptions_read_own on public.push_subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Live updates for the notification bell (Realtime respects the policies above).
alter publication supabase_realtime add table public.notifications;

-- -----------------------------------------------------------------------------
-- Creating notifications (used by every later feature)
-- -----------------------------------------------------------------------------
create function private.notify(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text default null,
  p_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.profiles where id = p_user_id and is_active) then
    return null;
  end if;
  insert into public.notifications (user_id, type, title, body, url)
  values (p_user_id, p_type, left(p_title, 200), left(p_body, 1000), p_url)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.send_test_notification()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_active_user() then
    raise exception 'ليست لديك صلاحية لهذا الإجراء' using errcode = '42501';
  end if;
  return private.notify(
    auth.uid(),
    'test',
    'إشعار تجريبي',
    'إذا وصلك هذا الإشعار فالإشعارات تعمل على هذا الجهاز.',
    '/m/notifications'
  );
end;
$$;

create function public.mark_all_notifications_read()
returns integer
language sql
security definer
set search_path = ''
as $$
  with updated as (
    update public.notifications
       set read_at = now()
     where user_id = auth.uid() and read_at is null and private.is_active_user()
    returning 1
  )
  select count(*)::integer from updated;
$$;

-- -----------------------------------------------------------------------------
-- Device subscriptions. A device belongs to whoever registered it last, so a
-- shared phone stops receiving the previous user's notifications.
-- -----------------------------------------------------------------------------
create function public.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_active_user() then
    raise exception 'ليست لديك صلاحية لهذا الإجراء' using errcode = '42501';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 500));
end;
$$;

-- -----------------------------------------------------------------------------
-- Push delivery
-- -----------------------------------------------------------------------------
create function private.request_push_dispatch(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
  v_bypass text;
  v_headers jsonb;
begin
  if p_ids is null or cardinality(p_ids) = 0 then
    return;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_dispatch_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_dispatch_secret';
  if v_url is null or v_secret is null then
    return; -- Not configured yet: pushes stay pending.
  end if;

  v_headers := jsonb_build_object('Content-Type', 'application/json', 'x-dispatch-secret', v_secret);
  -- Vercel preview deployments are protected; this header lets the database through.
  select decrypted_secret into v_bypass from vault.decrypted_secrets where name = 'vercel_protection_bypass';
  if v_bypass is not null then
    v_headers := v_headers || jsonb_build_object('x-vercel-protection-bypass', v_bypass);
  end if;

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('ids', to_jsonb(p_ids)),
    headers := v_headers,
    timeout_milliseconds := 10000
  );
end;
$$;

-- After new notifications: users without devices are marked "skipped", the
-- rest are handed to the app in one request.
create function private.on_notifications_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
begin
  update public.notifications n
     set push_status = 'skipped'
    from inserted i
   where n.id = i.id
     and not exists (select 1 from public.push_subscriptions s where s.user_id = i.user_id);

  select array_agg(i.id)
    into v_ids
    from inserted i
   where exists (select 1 from public.push_subscriptions s where s.user_id = i.user_id);

  perform private.request_push_dispatch(v_ids);
  return null;
end;
$$;

create trigger notifications_request_push
  after insert on public.notifications
  referencing new table as inserted
  for each statement execute function private.on_notifications_inserted();

-- Called by the app with the secret key: marks a batch as sent before sending,
-- so two dispatchers can never deliver the same notification twice.
create function public.claim_push_batch(p_ids uuid[])
returns table (id uuid, user_id uuid, title text, body text, url text)
language sql
security definer
set search_path = ''
as $$
  update public.notifications n
     set push_status = 'sent',
         push_attempts = n.push_attempts + 1,
         push_error = null
   where n.id = any (p_ids)
     and n.push_status in ('pending', 'failed')
     and n.push_attempts < 5
  returning n.id, n.user_id, n.title, n.body, n.url;
$$;

create function public.record_push_failure(p_id uuid, p_error text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
     set push_status = case when push_attempts >= 5 then 'skipped'::public.push_status else 'failed' end,
         push_error = left(p_error, 500)
   where id = p_id;
$$;

-- Retries pushes that are still waiting (every five minutes, for one day).
create function private.retry_pushes()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
begin
  select array_agg(id)
    into v_ids
    from (
      select n.id
        from public.notifications n
       where n.push_status in ('pending', 'failed')
         and n.push_attempts < 5
         and n.created_at between now() - interval '1 day' and now() - interval '1 minute'
       order by n.created_at
       limit 200
    ) as due;
  perform private.request_push_dispatch(v_ids);
  return coalesce(cardinality(v_ids), 0);
end;
$$;

-- Stores the push endpoint and secret in Vault (service role, once per environment).
-- p_vercel_bypass: the deployment's "Protection Bypass for Automation" secret,
-- needed only when the deployment is protected (Vercel previews).
create function public.configure_push_dispatch(p_url text, p_secret text, p_vercel_bypass text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_url !~ '^https?://' or char_length(coalesce(p_secret, '')) < 32 then
    raise exception 'رابط غير صالح أو سرّ قصير (32 خانة على الأقل)' using errcode = '22023';
  end if;

  select id into v_id from vault.secrets where name = 'push_dispatch_url';
  if v_id is null then
    perform vault.create_secret(p_url, 'push_dispatch_url', 'Web Push dispatch endpoint');
  else
    perform vault.update_secret(v_id, p_url);
  end if;

  select id into v_id from vault.secrets where name = 'push_dispatch_secret';
  if v_id is null then
    perform vault.create_secret(p_secret, 'push_dispatch_secret', 'Shared secret for the dispatch endpoint');
  else
    perform vault.update_secret(v_id, p_secret);
  end if;

  if p_vercel_bypass is not null then
    select id into v_id from vault.secrets where name = 'vercel_protection_bypass';
    if v_id is null then
      perform vault.create_secret(p_vercel_bypass, 'vercel_protection_bypass', 'Vercel deployment protection bypass');
    else
      perform vault.update_secret(v_id, p_vercel_bypass);
    end if;
  end if;
end;
$$;

select cron.schedule('green-o-retry-pushes', '*/5 * * * *', $$select private.retry_pushes()$$);

-- -----------------------------------------------------------------------------
-- Privileges
-- -----------------------------------------------------------------------------
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;

grant execute on function
  public.send_test_notification(),
  public.mark_all_notifications_read(),
  public.register_push_subscription(text, text, text, text)
to authenticated;

grant execute on function
  public.claim_push_batch(uuid[]),
  public.record_push_failure(uuid, text),
  public.configure_push_dispatch(text, text, text)
to service_role;
