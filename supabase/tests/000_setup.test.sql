-- Installs helpers used by every other test file. Committed (not rolled back),
-- because test files run one after another in alphabetical order.
begin;
select plan(1);

create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

create sequence if not exists tests.employee_no_seq start 800000;

-- pgTAP's own functions must stay callable while a test runs as anon or
-- authenticated (the migrations revoke EXECUTE from PUBLIC by default).
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
      from pg_proc p
      join pg_depend d on d.objid = p.oid and d.deptype = 'e'
      join pg_extension e on e.oid = d.refobjid
     where e.extname = 'pgtap'
  loop
    begin
      execute format('grant execute on function %s to anon, authenticated', r.signature);
    exception when insufficient_privilege then
      null;
    end;
  end loop;
end $$;

-- A login account without a profile (for create_user_profile tests).
create or replace function tests.create_auth_user(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated',
    p_id::text || '@test.invalid', '', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );
  return p_id;
end;
$$;

-- A login account with a profile and employee details.
create or replace function tests.create_user(
  p_id uuid,
  p_role public.app_role,
  p_department uuid,
  p_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform tests.create_auth_user(p_id);
  insert into public.profiles (id, full_name, role, department_id, is_active)
  values (p_id, 'مستخدم تجريبي ' || left(p_id::text, 4), p_role, p_department, p_active);
  insert into public.employee_details (user_id, employee_no)
  values (p_id, nextval('tests.employee_no_seq')::text);
  return p_id;
end;
$$;

-- Acts as this user for the rest of the transaction, like PostgREST does.
-- Switch back with:  reset role; select tests.clear_claims();
create or replace function tests.authenticate_as(p_user uuid)
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::text,
    true
  );
  perform set_config('role', 'authenticated', true);
end;
$$;

create or replace function tests.authenticate_as_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end;
$$;

create or replace function tests.clear_claims()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '', true);
end;
$$;

grant execute on all functions in schema tests to anon, authenticated;

select pass('test helpers are installed');
select * from finish();
commit;
