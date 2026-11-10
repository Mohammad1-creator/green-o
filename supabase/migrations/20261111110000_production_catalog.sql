-- Phase 8: the production catalog: flexible specifications, products,
-- stages, product routes and defect types.
--
-- A manager defines the specifications (label, type, unit, options, limits)
-- and product forms are built from them. A product keeps its values in a
-- jsonb object keyed by the specification's id, so a specification can be
-- renamed freely; a trigger checks every value against its definition.
-- The general manager and the production manager edit the catalog, and
-- everyone signed in can read it.

create type public.spec_type as enum ('text', 'number', 'select', 'boolean');

create function private.manages_production()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_gm() or private.is_production_manager();
$$;

-- -----------------------------------------------------------------------------
-- Specifications
-- -----------------------------------------------------------------------------
create table public.spec_definitions (
  id uuid primary key default gen_random_uuid(),
  label text not null
    constraint spec_definitions_label_length check (char_length(btrim(label)) between 1 and 80),
  data_type public.spec_type not null,
  unit text,
  options text[],
  min_value numeric,
  max_value numeric,
  is_required boolean not null default false,
  sort_order integer not null default 0
    constraint spec_definitions_sort_order check (sort_order between 0 and 10000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint spec_definitions_unit check (
    unit is null or (data_type = 'number' and char_length(unit) between 1 and 20)
  ),
  constraint spec_definitions_options check ((data_type = 'select') = (options is not null)),
  constraint spec_definitions_limits check (
    (data_type = 'number' or (min_value is null and max_value is null))
    and (min_value is null or max_value is null or min_value <= max_value)
  )
);

create unique index spec_definitions_label_unique on public.spec_definitions (lower(btrim(label)));

create trigger spec_definitions_updated_at
  before update on public.spec_definitions
  for each row execute function private.set_updated_at();

-- Tidies a definition and refuses changes that would break existing products.
create function private.spec_definitions_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
  v_options text[];
  v_bad text;
begin
  new.label := btrim(new.label);
  new.unit := nullif(btrim(coalesce(new.unit, '')), '');

  if new.data_type = 'select' then
    v_options := array(
      select btrim(option) from unnest(coalesce(new.options, '{}')) as option where btrim(option) <> ''
    );
    if cardinality(v_options) = 0 then
      raise exception 'أضف خياراً واحداً على الأقل' using errcode = 'P0001';
    end if;
    if cardinality(v_options) > 50 then
      raise exception 'الحد الأقصى 50 خياراً' using errcode = 'P0001';
    end if;
    if (select count(distinct option) from unnest(v_options) as option) <> cardinality(v_options) then
      raise exception 'في الخيارات قيمة مكررة' using errcode = 'P0001';
    end if;
    if exists (select 1 from unnest(v_options) as option where char_length(option) > 80) then
      raise exception 'أحد الخيارات طويل جداً (80 حرفاً على الأكثر)' using errcode = 'P0001';
    end if;
    new.options := v_options;
  else
    new.options := null;
  end if;

  if new.data_type <> 'number' then
    new.unit := null;
    new.min_value := null;
    new.max_value := null;
  elsif new.min_value is not null and new.max_value is not null and new.min_value > new.max_value then
    raise exception 'الحد الأدنى أكبر من الحد الأعلى' using errcode = 'P0001';
  end if;

  if tg_op = 'UPDATE' then
    v_key := old.id::text;
    if new.data_type <> old.data_type
       and exists (select 1 from public.products where specs ? v_key) then
      raise exception 'لا يمكن تغيير نوع مواصفة مستخدمة في منتجات' using errcode = 'P0001';
    end if;
    if new.data_type = 'select' then
      select p.specs ->> v_key into v_bad
        from public.products p
       where p.specs ? v_key and not ((p.specs ->> v_key) = any (new.options))
       limit 1;
      if v_bad is not null then
        raise exception 'الخيار «%» مستخدم في منتجات، فلا يمكن حذفه', v_bad using errcode = 'P0001';
      end if;
    end if;
    if new.data_type = 'number' and exists (
      select 1 from public.products p
       where p.specs ? v_key
         and ((new.min_value is not null and (p.specs ->> v_key)::numeric < new.min_value)
           or (new.max_value is not null and (p.specs ->> v_key)::numeric > new.max_value))
    ) then
      raise exception 'توجد منتجات قيمها خارج الحدود الجديدة. عدّلها أولاً' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger spec_definitions_check
  before insert or update on public.spec_definitions
  for each row execute function private.spec_definitions_check();

-- -----------------------------------------------------------------------------
-- Products
-- -----------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  code text not null
    constraint products_code_length check (char_length(btrim(code)) between 1 and 40),
  name text not null
    constraint products_name_length check (char_length(btrim(name)) between 1 and 120),
  unit text not null
    constraint products_unit_length check (char_length(btrim(unit)) between 1 and 20),
  specs jsonb not null default '{}'::jsonb
    constraint products_specs_object check (jsonb_typeof(specs) = 'object'),
  notes text
    constraint products_notes_length check (notes is null or char_length(notes) <= 2000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create unique index products_code_unique on public.products (lower(btrim(code)));
create index products_specs_idx on public.products using gin (specs);

create trigger products_updated_at
  before update on public.products
  for each row execute function private.set_updated_at();

-- Checks each value against its definition and returns the tidied object.
-- An empty value means "not set". Required specifications must be present.
create function private.check_product_specs(p_specs jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_out jsonb := '{}'::jsonb;
  v_key text;
  v_value jsonb;
  v_def public.spec_definitions;
  v_number numeric;
  v_text text;
begin
  if p_specs is null or jsonb_typeof(p_specs) <> 'object' then
    raise exception 'المواصفات غير صالحة' using errcode = '22023';
  end if;

  for v_key, v_value in select key, value from jsonb_each(p_specs) loop
    continue when jsonb_typeof(v_value) = 'null'
      or (jsonb_typeof(v_value) = 'string' and btrim(v_value #>> '{}') = '');

    select * into v_def from public.spec_definitions where id = private.try_uuid(v_key);
    if not found then
      raise exception 'مواصفة غير معروفة' using errcode = '22023';
    end if;

    case v_def.data_type
      when 'number' then
        if jsonb_typeof(v_value) <> 'number' then
          raise exception '«%» يجب أن تكون رقماً', v_def.label using errcode = '22023';
        end if;
        v_number := (v_value #>> '{}')::numeric;
        if v_def.min_value is not null and v_number < v_def.min_value then
          raise exception '«%» لا تقل عن %', v_def.label, v_def.min_value using errcode = '22023';
        end if;
        if v_def.max_value is not null and v_number > v_def.max_value then
          raise exception '«%» لا تزيد على %', v_def.label, v_def.max_value using errcode = '22023';
        end if;
      when 'boolean' then
        if jsonb_typeof(v_value) <> 'boolean' then
          raise exception '«%» يجب أن تكون نعم أو لا', v_def.label using errcode = '22023';
        end if;
      when 'select' then
        if jsonb_typeof(v_value) <> 'string' or not ((v_value #>> '{}') = any (v_def.options)) then
          raise exception 'اختر قيمة «%» من القائمة', v_def.label using errcode = '22023';
        end if;
      when 'text' then
        if jsonb_typeof(v_value) <> 'string' then
          raise exception '«%» يجب أن تكون نصاً', v_def.label using errcode = '22023';
        end if;
        v_text := btrim(v_value #>> '{}');
        if char_length(v_text) > 500 then
          raise exception '«%» طويلة جداً (500 حرف على الأكثر)', v_def.label using errcode = '22023';
        end if;
        v_value := to_jsonb(v_text);
    end case;

    v_out := v_out || jsonb_build_object(v_def.id::text, v_value);
  end loop;

  select * into v_def
    from public.spec_definitions
   where is_active and is_required and not (v_out ? id::text)
   order by sort_order, label
   limit 1;
  if found then
    raise exception 'المواصفة «%» مطلوبة', v_def.label using errcode = '22023';
  end if;
  return v_out;
end;
$$;

-- Only when the values change, so an old product can still be renamed or
-- deactivated after a new required specification is added.
create function private.products_check_specs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.specs := private.check_product_specs(new.specs);
  return new;
end;
$$;

create trigger products_check_specs
  before insert or update of specs on public.products
  for each row execute function private.products_check_specs();

-- -----------------------------------------------------------------------------
-- Stages and routes
-- -----------------------------------------------------------------------------
create table public.stages (
  id uuid primary key default gen_random_uuid(),
  name text not null
    constraint stages_name_length check (char_length(btrim(name)) between 1 and 60),
  sort_order integer not null default 0
    constraint stages_sort_order check (sort_order between 0 and 10000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create unique index stages_name_unique on public.stages (lower(btrim(name)));

create trigger stages_updated_at
  before update on public.stages
  for each row execute function private.set_updated_at();

-- A product's route: its stages in order. A product never passes through the
-- same stage twice. Orders copy the route when they are created, so editing
-- it later does not change orders already running.
create table public.product_route_steps (
  product_id uuid not null references public.products (id),
  seq integer not null
    constraint product_route_steps_seq check (seq between 1 and 50),
  stage_id uuid not null references public.stages (id),
  primary key (product_id, seq),
  constraint product_route_steps_stage_once unique (product_id, stage_id)
);

create index product_route_steps_stage_idx on public.product_route_steps (stage_id);

create table public.defect_types (
  id uuid primary key default gen_random_uuid(),
  name text not null
    constraint defect_types_name_length check (char_length(btrim(name)) between 1 and 80),
  -- Null: the defect can happen at any stage.
  stage_id uuid references public.stages (id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create unique index defect_types_name_unique on public.defect_types (
  lower(btrim(name)),
  coalesce(stage_id, '00000000-0000-0000-0000-000000000000'::uuid)
);
create index defect_types_stage_idx on public.defect_types (stage_id);

create trigger defect_types_updated_at
  before update on public.defect_types
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Row level security: everyone signed in reads; production managers write
-- -----------------------------------------------------------------------------
alter table public.spec_definitions enable row level security;
alter table public.products enable row level security;
alter table public.stages enable row level security;
alter table public.product_route_steps enable row level security;
alter table public.defect_types enable row level security;

grant select on public.spec_definitions, public.products, public.stages,
  public.product_route_steps, public.defect_types to authenticated;

grant insert (label, data_type, unit, options, min_value, max_value, is_required, sort_order, is_active),
      update (label, data_type, unit, options, min_value, max_value, is_required, sort_order, is_active)
  on public.spec_definitions to authenticated;
grant insert (code, name, unit, specs, notes, is_active),
      update (code, name, unit, specs, notes, is_active)
  on public.products to authenticated;
grant insert (name, sort_order, is_active), update (name, sort_order, is_active)
  on public.stages to authenticated;
grant insert (name, stage_id, is_active), update (name, stage_id, is_active)
  on public.defect_types to authenticated;
-- Routes change only through set_product_route().

create policy spec_definitions_read on public.spec_definitions
  for select to authenticated using ((select private.is_active_user()));
create policy spec_definitions_insert on public.spec_definitions
  for insert to authenticated with check ((select private.manages_production()));
create policy spec_definitions_update on public.spec_definitions
  for update to authenticated
  using ((select private.manages_production()))
  with check ((select private.manages_production()));

create policy products_read on public.products
  for select to authenticated using ((select private.is_active_user()));
create policy products_insert on public.products
  for insert to authenticated with check ((select private.manages_production()));
create policy products_update on public.products
  for update to authenticated
  using ((select private.manages_production()))
  with check ((select private.manages_production()));

create policy stages_read on public.stages
  for select to authenticated using ((select private.is_active_user()));
create policy stages_insert on public.stages
  for insert to authenticated with check ((select private.manages_production()));
create policy stages_update on public.stages
  for update to authenticated
  using ((select private.manages_production()))
  with check ((select private.manages_production()));

create policy product_route_steps_read on public.product_route_steps
  for select to authenticated using ((select private.is_active_user()));

create policy defect_types_read on public.defect_types
  for select to authenticated using ((select private.is_active_user()));
create policy defect_types_insert on public.defect_types
  for insert to authenticated with check ((select private.manages_production()));
create policy defect_types_update on public.defect_types
  for update to authenticated
  using ((select private.manages_production()))
  with check ((select private.manages_production()));

create trigger audit_spec_definitions
  after insert or update or delete on public.spec_definitions
  for each row execute function audit.log_change('id', 'updated_at');
create trigger audit_products
  after insert or update or delete on public.products
  for each row execute function audit.log_change('id', 'updated_at');
create trigger audit_stages
  after insert or update or delete on public.stages
  for each row execute function audit.log_change('id', 'updated_at');
create trigger audit_defect_types
  after insert or update or delete on public.defect_types
  for each row execute function audit.log_change('id', 'updated_at');

-- -----------------------------------------------------------------------------
-- Routes
-- -----------------------------------------------------------------------------
-- Replaces a product's route in one step, and logs it as a single change.
create function public.set_product_route(p_product_id uuid, p_stage_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb := to_jsonb(coalesce(p_stage_ids, '{}'));
begin
  if not private.is_active_user() or not private.manages_production() then
    raise exception 'مسارات المنتجات لمدير الإنتاج' using errcode = '42501';
  end if;
  perform 1 from public.products where id = p_product_id for update;
  if not found then
    raise exception 'المنتج غير موجود' using errcode = 'P0002';
  end if;
  if coalesce(cardinality(p_stage_ids), 0) = 0 then
    raise exception 'أضف مرحلة واحدة على الأقل' using errcode = 'P0001';
  end if;
  if cardinality(p_stage_ids) > 50 then
    raise exception 'الحد الأقصى 50 مرحلة' using errcode = 'P0001';
  end if;
  if array_position(p_stage_ids, null) is not null
     or (select count(distinct stage) from unnest(p_stage_ids) as stage) <> cardinality(p_stage_ids) then
    raise exception 'لا يمر المنتج بالمرحلة نفسها مرتين' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from unnest(p_stage_ids) as stage
     where not exists (select 1 from public.stages s where s.id = stage and s.is_active)
  ) then
    raise exception 'إحدى المراحل غير موجودة أو موقوفة' using errcode = 'P0001';
  end if;

  select coalesce(jsonb_agg(stage_id order by seq), '[]'::jsonb) into v_old
    from public.product_route_steps
   where product_id = p_product_id;
  if v_old = v_new then
    return;
  end if;

  delete from public.product_route_steps where product_id = p_product_id;
  insert into public.product_route_steps (product_id, seq, stage_id)
  select p_product_id, step, stage
    from unnest(p_stage_ids) with ordinality as route(stage, step);

  perform audit.append(
    'update',
    'public.product_route_steps',
    p_product_id::text,
    jsonb_build_object('stages', v_old),
    jsonb_build_object('stages', v_new),
    array['stages']
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Privileges
-- -----------------------------------------------------------------------------
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;

grant execute on function private.manages_production() to authenticated;
grant execute on function public.set_product_route(uuid, uuid[]) to authenticated;
