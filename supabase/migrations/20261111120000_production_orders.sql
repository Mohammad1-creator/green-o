-- Phase 9: production orders, stage assignment and quantities.
--
-- An order copies its product's route when it is created, so later route
-- edits do not touch running orders. Workers are assigned per stage and
-- record good and defective quantities. Stages run in parallel: a stage's
-- input is the order quantity (first stage) or the good quantity of the
-- stage before it, and a stage can never record more than its input.
-- Defective pieces leave the flow. Every entry and every void locks the
-- order row first, so two workers recording at the same moment cannot
-- exceed the limit together. Only these functions change the tables.

create type public.order_status as enum ('open', 'in_progress', 'completed', 'cancelled');
create type public.order_stage_status as enum ('pending', 'active', 'closed');

create sequence public.order_number_seq;

create table public.production_orders (
  id uuid primary key default gen_random_uuid(),
  number bigint not null default nextval('public.order_number_seq') unique,
  product_id uuid not null references public.products (id),
  department_id uuid not null references public.departments (id),
  quantity numeric(14, 3) not null
    constraint production_orders_quantity check (quantity > 0 and quantity <= 1000000000),
  -- The product's unit when the order was created.
  unit text not null,
  due_date date,
  status public.order_status not null default 'open',
  notes text
    constraint production_orders_notes_length check (notes is null or char_length(notes) <= 2000),
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter sequence public.order_number_seq owned by public.production_orders.number;

create index production_orders_status_idx on public.production_orders (status);
create index production_orders_department_idx on public.production_orders (department_id);
create index production_orders_product_idx on public.production_orders (product_id);

create trigger production_orders_updated_at
  before update on public.production_orders
  for each row execute function private.set_updated_at();

create table public.order_stages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.production_orders (id),
  seq integer not null,
  stage_id uuid not null references public.stages (id),
  status public.order_stage_status not null default 'pending',
  -- Totals of the stage's entries that are not voided.
  good_qty numeric(14, 3) not null default 0,
  defect_qty numeric(14, 3) not null default 0,
  closed_at timestamptz,
  closed_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  constraint order_stages_seq unique (order_id, seq),
  constraint order_stages_stage_once unique (order_id, stage_id),
  constraint order_stages_totals check (good_qty >= 0 and defect_qty >= 0)
);

create index order_stages_stage_idx on public.order_stages (stage_id);

create trigger order_stages_updated_at
  before update on public.order_stages
  for each row execute function private.set_updated_at();

create table public.order_stage_assignees (
  order_stage_id uuid not null references public.order_stages (id),
  user_id uuid not null references public.profiles (id),
  assigned_at timestamptz not null default now(),
  assigned_by uuid default auth.uid() references auth.users (id) on delete set null,
  primary key (order_stage_id, user_id)
);

create index order_stage_assignees_user_idx on public.order_stage_assignees (user_id);

create table public.stage_entries (
  id uuid primary key default gen_random_uuid(),
  order_stage_id uuid not null references public.order_stages (id),
  worker_id uuid not null references public.profiles (id),
  good_qty numeric(14, 3) not null default 0,
  defect_qty numeric(14, 3) not null default 0,
  defect_type_id uuid references public.defect_types (id),
  note text
    constraint stage_entries_note_length check (note is null or char_length(note) <= 500),
  recorded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references public.profiles (id),
  void_reason text,
  constraint stage_entries_quantities
    check (good_qty >= 0 and defect_qty >= 0 and good_qty + defect_qty > 0),
  constraint stage_entries_defect_type check ((defect_qty > 0) = (defect_type_id is not null)),
  constraint stage_entries_void check ((voided_at is null) = (void_reason is null))
);

create index stage_entries_stage_idx on public.stage_entries (order_stage_id);
create index stage_entries_worker_idx on public.stage_entries (worker_id, created_at);
create index stage_entries_defect_type_idx on public.stage_entries (defect_type_id);

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
-- "P-000012"
create function public.order_code(p_number bigint)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'P-' || lpad(p_number::text, 6, '0');
$$;

create function private.order_of_stage(p_order_stage uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select order_id from public.order_stages where id = p_order_stage;
$$;

-- The general manager, or the production manager of the order's department.
create function private.manages_order(p_order uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.production_orders o
     where o.id = p_order
       and (private.is_gm()
            or (private.is_production_manager() and private.manages_department(o.department_id)))
  );
$$;

create function private.works_on_order(p_order uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.order_stages s
      join public.order_stage_assignees a on a.order_stage_id = s.id
     where s.order_id = p_order and a.user_id = (select auth.uid())
  );
$$;

create function private.can_view_order(p_order uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user()
     and (private.manages_order(p_order) or private.works_on_order(p_order));
$$;

-- A quantity with at most three decimals, not negative, not absurd.
create function private.check_quantity(p_value numeric, p_label text, p_allow_zero boolean default false)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_value is null or p_value < 0 or (p_value = 0 and not p_allow_zero) then
    raise exception '%: اكتب كمية أكبر من صفر', p_label using errcode = 'P0001';
  end if;
  if p_value > 1000000000 then
    raise exception '%: الكمية كبيرة جداً', p_label using errcode = 'P0001';
  end if;
  if p_value <> round(p_value, 3) then
    raise exception '%: ثلاث خانات عشرية على الأكثر', p_label using errcode = 'P0001';
  end if;
end;
$$;

-- Computed columns (select=input_qty,available_qty): what a stage receives,
-- and what it can still record.
create function public.input_qty(s public.order_stages)
returns numeric
language sql
stable
set search_path = ''
as $$
  select case
    when s.seq = 1 then (select o.quantity from public.production_orders o where o.id = s.order_id)
    else coalesce(
      (select p.good_qty from public.order_stages p where p.order_id = s.order_id and p.seq = s.seq - 1),
      0
    )
  end;
$$;

create function public.available_qty(s public.order_stages)
returns numeric
language sql
stable
set search_path = ''
as $$
  select public.input_qty(s) - s.good_qty - s.defect_qty;
$$;

-- -----------------------------------------------------------------------------
-- Row level security: reads only; every change goes through the functions
-- -----------------------------------------------------------------------------
alter table public.production_orders enable row level security;
alter table public.order_stages enable row level security;
alter table public.order_stage_assignees enable row level security;
alter table public.stage_entries enable row level security;

grant select on public.production_orders, public.order_stages,
  public.order_stage_assignees, public.stage_entries to authenticated;

create policy production_orders_read on public.production_orders
  for select to authenticated
  using (private.can_view_order(id));

create policy order_stages_read on public.order_stages
  for select to authenticated
  using (private.can_view_order(order_id));

create policy order_stage_assignees_read on public.order_stage_assignees
  for select to authenticated
  using (private.can_view_order(private.order_of_stage(order_stage_id)));

-- Managers see every entry of their orders; workers see their own.
create policy stage_entries_read on public.stage_entries
  for select to authenticated
  using (
    (select private.is_active_user())
    and (worker_id = (select auth.uid())
         or private.manages_order(private.order_of_stage(order_stage_id)))
  );

create trigger audit_production_orders
  after insert or update or delete on public.production_orders
  for each row execute function audit.log_change('id', 'updated_at');
-- Running totals change with every entry; the entries are audited themselves.
create trigger audit_order_stages
  after insert or update or delete on public.order_stages
  for each row execute function audit.log_change('id', 'updated_at,good_qty,defect_qty');
create trigger audit_order_stage_assignees
  after insert or update or delete on public.order_stage_assignees
  for each row execute function audit.log_change('order_stage_id,user_id', 'assigned_at');
create trigger audit_stage_entries
  after insert or update or delete on public.stage_entries
  for each row execute function audit.log_change('id', 'updated_at');

-- Workers watch their stage's available quantity change.
alter publication supabase_realtime add table public.order_stages;

-- -----------------------------------------------------------------------------
-- Orders
-- -----------------------------------------------------------------------------
create function public.create_production_order(
  p_product_id uuid,
  p_quantity numeric,
  p_due_date date default null,
  p_notes text default null,
  p_department_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_department uuid := coalesce(p_department_id, private.my_department());
  v_product public.products;
  v_order uuid;
begin
  if not private.is_active_user() or not (private.is_gm() or private.is_production_manager()) then
    raise exception 'أوامر الإنتاج لمدير الإنتاج' using errcode = '42501';
  end if;
  if v_department is null then
    raise exception 'اختر القسم' using errcode = 'P0001';
  end if;
  if not private.manages_department(v_department) then
    raise exception 'لا يمكنك إنشاء أوامر لقسم آخر' using errcode = '42501';
  end if;
  if not exists (select 1 from public.departments where id = v_department and is_active) then
    raise exception 'القسم غير موجود أو موقوف' using errcode = 'P0001';
  end if;

  select * into v_product from public.products where id = p_product_id;
  if not found or not v_product.is_active then
    raise exception 'المنتج غير موجود أو موقوف' using errcode = 'P0001';
  end if;
  perform private.check_quantity(p_quantity, 'كمية الأمر');
  if p_due_date is not null and p_due_date < private.factory_today() then
    raise exception 'تاريخ التسليم مضى. اختر تاريخاً قادماً' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.product_route_steps where product_id = p_product_id) then
    raise exception 'حدّد مسار مراحل المنتج أولاً' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.product_route_steps r
      join public.stages s on s.id = r.stage_id
     where r.product_id = p_product_id and not s.is_active
  ) then
    raise exception 'مسار المنتج فيه مرحلة موقوفة. عدّل المسار أولاً' using errcode = 'P0001';
  end if;

  insert into public.production_orders (product_id, department_id, quantity, unit, due_date, notes)
  values (p_product_id, v_department, p_quantity, v_product.unit, p_due_date, nullif(btrim(p_notes), ''))
  returning id into v_order;

  insert into public.order_stages (order_id, seq, stage_id)
  select v_order, row_number() over (order by r.seq), r.stage_id
    from public.product_route_steps r
   where r.product_id = p_product_id;
  return v_order;
end;
$$;

create function public.update_production_order(
  p_order_id uuid,
  p_quantity numeric,
  p_due_date date default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.production_orders;
  v_first_used numeric;
begin
  select * into v_order from public.production_orders where id = p_order_id for update;
  if not found then
    raise exception 'الأمر غير موجود' using errcode = 'P0002';
  end if;
  if not private.is_active_user() or not private.manages_order(p_order_id) then
    raise exception 'تعديل الأوامر لمدير الإنتاج' using errcode = '42501';
  end if;
  if v_order.status in ('completed', 'cancelled') then
    raise exception 'الأمر مغلق' using errcode = 'P0001';
  end if;
  perform private.check_quantity(p_quantity, 'كمية الأمر');
  select good_qty + defect_qty into v_first_used
    from public.order_stages where order_id = p_order_id and seq = 1;
  if p_quantity < coalesce(v_first_used, 0) then
    raise exception 'الكمية أقل مما سُجّل في المرحلة الأولى (%)', trim_scale(v_first_used)
      using errcode = 'P0001';
  end if;
  if p_due_date is distinct from v_order.due_date
     and p_due_date is not null and p_due_date < private.factory_today() then
    raise exception 'تاريخ التسليم مضى. اختر تاريخاً قادماً' using errcode = 'P0001';
  end if;

  update public.production_orders
     set quantity = p_quantity, due_date = p_due_date, notes = nullif(btrim(p_notes), '')
   where id = p_order_id;
end;
$$;

create function public.cancel_production_order(p_order_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.production_orders;
  v_worker uuid;
begin
  select * into v_order from public.production_orders where id = p_order_id for update;
  if not found then
    raise exception 'الأمر غير موجود' using errcode = 'P0002';
  end if;
  if not private.is_active_user() or not private.manages_order(p_order_id) then
    raise exception 'إلغاء الأوامر لمدير الإنتاج' using errcode = '42501';
  end if;
  if v_order.status in ('completed', 'cancelled') then
    raise exception 'الأمر مغلق' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'اكتب سبب الإلغاء' using errcode = 'P0001';
  end if;

  update public.production_orders
     set status = 'cancelled', cancelled_at = now(), cancel_reason = btrim(p_reason)
   where id = p_order_id;

  for v_worker in
    select distinct a.user_id
      from public.order_stages s
      join public.order_stage_assignees a on a.order_stage_id = s.id
     where s.order_id = p_order_id and s.status <> 'closed'
  loop
    perform private.notify(
      v_worker,
      'order_cancelled',
      'أُلغي أمر الإنتاج ' || public.order_code(v_order.number),
      btrim(p_reason),
      '/m/production'
    );
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Stages
-- -----------------------------------------------------------------------------
-- Replaces a stage's workers. Workers removed keep their past entries.
create function public.assign_stage_workers(p_order_stage_id uuid, p_user_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stage public.order_stages;
  v_order public.production_orders;
  v_ids uuid[] := coalesce(p_user_ids, '{}');
  v_stage_name text;
  v_product_name text;
  v_user uuid;
begin
  select * into v_stage from public.order_stages where id = p_order_stage_id;
  if not found then
    raise exception 'المرحلة غير موجودة' using errcode = 'P0002';
  end if;
  select * into v_order from public.production_orders where id = v_stage.order_id for update;
  if not private.is_active_user() or not private.manages_order(v_order.id) then
    raise exception 'إسناد العمال لمدير الإنتاج' using errcode = '42501';
  end if;
  if v_order.status in ('completed', 'cancelled') then
    raise exception 'الأمر مغلق' using errcode = 'P0001';
  end if;
  if v_stage.status = 'closed' then
    raise exception 'المرحلة مغلقة' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from unnest(v_ids) as worker
     where not exists (
       select 1 from public.profiles p
        where p.id = worker and p.is_active and p.department_id = v_order.department_id
     )
  ) then
    raise exception 'العمال يجب أن يكونوا من قسم الأمر وحساباتهم نشطة' using errcode = 'P0001';
  end if;

  delete from public.order_stage_assignees
   where order_stage_id = p_order_stage_id and not (user_id = any (v_ids));

  select name into v_stage_name from public.stages where id = v_stage.stage_id;
  select name into v_product_name from public.products where id = v_order.product_id;
  for v_user in
    select distinct worker from unnest(v_ids) as worker
     where not exists (
       select 1 from public.order_stage_assignees a
        where a.order_stage_id = p_order_stage_id and a.user_id = worker
     )
  loop
    insert into public.order_stage_assignees (order_stage_id, user_id)
    values (p_order_stage_id, v_user);
    perform private.notify(
      v_user,
      'stage_assigned',
      'مرحلة إنتاج: ' || v_stage_name || ' — ' || v_product_name,
      'أمر الإنتاج ' || public.order_code(v_order.number),
      '/m/production/' || p_order_stage_id
    );
  end loop;
end;
$$;

-- Closing a stage needs every earlier stage closed; closing the last one
-- completes the order.
create function public.close_order_stage(p_order_stage_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stage public.order_stages;
  v_order public.production_orders;
begin
  select * into v_stage from public.order_stages where id = p_order_stage_id;
  if not found then
    raise exception 'المرحلة غير موجودة' using errcode = 'P0002';
  end if;
  select * into v_order from public.production_orders where id = v_stage.order_id for update;
  if not private.is_active_user() or not private.manages_order(v_order.id) then
    raise exception 'إغلاق المراحل لمدير الإنتاج' using errcode = '42501';
  end if;
  if v_order.status in ('completed', 'cancelled') then
    raise exception 'الأمر مغلق' using errcode = 'P0001';
  end if;
  select * into v_stage from public.order_stages where id = p_order_stage_id;
  if v_stage.status = 'closed' then
    raise exception 'المرحلة مغلقة مسبقاً' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.order_stages
     where order_id = v_order.id and seq < v_stage.seq and status <> 'closed'
  ) then
    raise exception 'أغلق المراحل السابقة أولاً' using errcode = 'P0001';
  end if;

  update public.order_stages
     set status = 'closed', closed_at = now(), closed_by = auth.uid()
   where id = p_order_stage_id;

  if not exists (select 1 from public.order_stages where order_id = v_order.id and status <> 'closed') then
    update public.production_orders
       set status = 'completed', completed_at = now()
     where id = v_order.id;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Quantities
-- -----------------------------------------------------------------------------
-- A worker records for themselves on a stage they are assigned to; a
-- production manager records on a worker's behalf (p_worker_id).
create function public.record_stage_entry(
  p_order_stage_id uuid,
  p_good_qty numeric,
  p_defect_qty numeric default 0,
  p_defect_type_id uuid default null,
  p_note text default null,
  p_worker_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid := private.order_of_stage(p_order_stage_id);
  v_order public.production_orders;
  v_stage public.order_stages;
  v_defect public.defect_types;
  v_worker uuid;
  v_good numeric := coalesce(p_good_qty, 0);
  v_bad numeric := coalesce(p_defect_qty, 0);
  v_available numeric;
  v_entry uuid;
begin
  if v_order_id is null then
    raise exception 'المرحلة غير موجودة' using errcode = 'P0002';
  end if;
  if not private.is_active_user() then
    raise exception 'الحساب غير نشط' using errcode = '42501';
  end if;

  -- One entry at a time per order: the totals below are read after the lock.
  select * into v_order from public.production_orders where id = v_order_id for update;
  select * into v_stage from public.order_stages where id = p_order_stage_id;

  if private.manages_order(v_order_id) and p_worker_id is distinct from auth.uid() then
    v_worker := p_worker_id;
    if v_worker is null then
      raise exception 'اختر العامل' using errcode = 'P0001';
    end if;
  else
    v_worker := auth.uid();
    if p_worker_id is not null and p_worker_id <> v_worker then
      raise exception 'تسجّل كمياتك أنت فقط' using errcode = '42501';
    end if;
  end if;
  if not exists (
    select 1 from public.order_stage_assignees
     where order_stage_id = p_order_stage_id and user_id = v_worker
  ) then
    raise exception 'العامل غير مُسند إلى هذه المرحلة' using errcode = '42501';
  end if;

  if v_order.status in ('completed', 'cancelled') then
    raise exception 'الأمر مغلق' using errcode = 'P0001';
  end if;
  if v_stage.status = 'closed' then
    raise exception 'المرحلة مغلقة' using errcode = 'P0001';
  end if;

  perform private.check_quantity(v_good, 'الكمية السليمة', true);
  perform private.check_quantity(v_bad, 'الكمية المعيبة', true);
  if v_good + v_bad = 0 then
    raise exception 'اكتب الكمية السليمة أو المعيبة' using errcode = 'P0001';
  end if;
  if v_bad > 0 then
    if p_defect_type_id is null then
      raise exception 'اختر نوع العيب' using errcode = 'P0001';
    end if;
    select * into v_defect from public.defect_types where id = p_defect_type_id;
    if not found or not v_defect.is_active
       or (v_defect.stage_id is not null and v_defect.stage_id <> v_stage.stage_id) then
      raise exception 'نوع العيب لا يخص هذه المرحلة' using errcode = 'P0001';
    end if;
  end if;

  v_available := public.available_qty(v_stage);
  if v_good + v_bad > v_available then
    raise exception 'الكمية أكبر من المتاح لهذه المرحلة. المتاح الآن: %', trim_scale(v_available)
      using errcode = 'P0001';
  end if;

  insert into public.stage_entries (
    order_stage_id, worker_id, good_qty, defect_qty, defect_type_id, note, recorded_by
  ) values (
    p_order_stage_id, v_worker, v_good, v_bad,
    case when v_bad > 0 then p_defect_type_id end,
    nullif(btrim(p_note), ''), auth.uid()
  )
  returning id into v_entry;

  update public.order_stages
     set good_qty = good_qty + v_good,
         defect_qty = defect_qty + v_bad,
         status = case when status = 'pending' then 'active'::public.order_stage_status else status end
   where id = p_order_stage_id;
  if v_order.status = 'open' then
    update public.production_orders set status = 'in_progress' where id = v_order_id;
  end if;
  return v_entry;
end;
$$;

-- Voids an entry (it stays visible, struck through). Refused when the next
-- stage has already used more than this stage would have left.
create function public.void_stage_entry(p_entry_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entry public.stage_entries;
  v_order_id uuid;
  v_order public.production_orders;
  v_stage public.order_stages;
  v_next public.order_stages;
begin
  select * into v_entry from public.stage_entries where id = p_entry_id;
  if not found then
    raise exception 'الإدخال غير موجود' using errcode = 'P0002';
  end if;
  v_order_id := private.order_of_stage(v_entry.order_stage_id);
  if not private.is_active_user() or not private.manages_order(v_order_id) then
    raise exception 'إلغاء الإدخالات لمدير الإنتاج' using errcode = '42501';
  end if;

  select * into v_order from public.production_orders where id = v_order_id for update;
  select * into v_entry from public.stage_entries where id = p_entry_id;
  select * into v_stage from public.order_stages where id = v_entry.order_stage_id;

  if v_entry.voided_at is not null then
    raise exception 'الإدخال ملغى مسبقاً' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'اكتب سبب الإلغاء' using errcode = 'P0001';
  end if;
  if v_order.status in ('completed', 'cancelled') then
    raise exception 'الأمر مغلق' using errcode = 'P0001';
  end if;
  if v_stage.status = 'closed' then
    raise exception 'المرحلة مغلقة، فلا تُلغى إدخالاتها' using errcode = 'P0001';
  end if;

  select * into v_next from public.order_stages
   where order_id = v_stage.order_id and seq = v_stage.seq + 1;
  if found and v_next.good_qty + v_next.defect_qty > v_stage.good_qty - v_entry.good_qty then
    raise exception 'لا يمكن الإلغاء: المرحلة التالية سجّلت كمية أكبر مما سيبقى' using errcode = 'P0001';
  end if;

  update public.stage_entries
     set voided_at = now(), voided_by = auth.uid(), void_reason = btrim(p_reason)
   where id = p_entry_id;
  update public.order_stages
     set good_qty = good_qty - v_entry.good_qty,
         defect_qty = defect_qty - v_entry.defect_qty
   where id = v_stage.id;

  perform private.notify(
    v_entry.worker_id,
    'entry_voided',
    'أُلغي إدخال كمية في أمر ' || public.order_code(v_order.number),
    btrim(p_reason),
    '/m/production/' || v_stage.id
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Privileges
-- -----------------------------------------------------------------------------
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;
revoke all on sequence public.order_number_seq from public, anon, authenticated;

grant execute on function
  private.order_of_stage(uuid),
  private.manages_order(uuid),
  private.works_on_order(uuid),
  private.can_view_order(uuid)
to authenticated;

grant execute on function
  public.order_code(bigint),
  public.input_qty(public.order_stages),
  public.available_qty(public.order_stages),
  public.create_production_order(uuid, numeric, date, text, uuid),
  public.update_production_order(uuid, numeric, date, text),
  public.cancel_production_order(uuid, text),
  public.assign_stage_workers(uuid, uuid[]),
  public.close_order_stage(uuid),
  public.record_stage_entry(uuid, numeric, numeric, uuid, text, uuid),
  public.void_stage_entry(uuid, text)
to authenticated;
