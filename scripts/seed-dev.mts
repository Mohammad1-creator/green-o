/**
 * Fills a local or dev database with demo data. It refuses to run anywhere
 * else, and all three guards must pass:
 *   1. APP_ENV is "local" or "dev";
 *   2. the Supabase URL is localhost or the dev project (DEV_PROJECT_REF);
 *   3. the database's own environment marker says "local" or "dev".
 *
 *   npm run seed:dev
 *
 * Safe to run again: existing departments and users are reused.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  adminClientFromEnv,
  fail,
  findAuthUserId,
  staffEmail,
} from "./lib/supabase-admin.mts";

const appEnv = process.env.APP_ENV;
if (appEnv !== "local" && appEnv !== "dev") {
  fail(`Refusing to seed: APP_ENV is "${appEnv ?? ""}", not local or dev.`);
}

const { supabase, url } = adminClientFromEnv();
const isLocalHost =
  url.hostname === "127.0.0.1" || url.hostname === "localhost";
const devRef = process.env.DEV_PROJECT_REF;
if (!isLocalHost && !(devRef && url.hostname === `${devRef}.supabase.co`)) {
  fail(
    "Refusing to seed: the URL is neither local nor the dev project (DEV_PROJECT_REF).",
  );
}

let { data: marker } = await supabase.rpc("environment_marker");
if (marker === "unset" && isLocalHost) {
  ({ data: marker } = await supabase.rpc("mark_local_environment"));
}
if (marker !== "local" && marker !== "dev") {
  fail(`Refusing to seed: the database marker is "${String(marker)}".`);
}

const password =
  process.env.SEED_PASSWORD ?? (isLocalHost ? "Local-Demo-2026" : undefined);
if (!password)
  fail(
    "Set SEED_PASSWORD: demo accounts on the dev project need a private password.",
  );

type DepartmentKey = "maintenance" | "production" | "quality";

const DEPARTMENTS: Record<DepartmentKey, string> = {
  maintenance: "الصيانة",
  production: "الإنتاج",
  quality: "الجودة",
};

type Role =
  "general_manager" | "maintenance_manager" | "production_manager" | "employee";

export const DEMO_USERS: {
  employeeNo: string;
  fullName: string;
  role: Role;
  department: DepartmentKey | null;
  jobTitle?: string;
}[] = [
  {
    employeeNo: "1000",
    fullName: "سارة الأحمد",
    role: "general_manager",
    department: null,
  },
  {
    employeeNo: "2000",
    fullName: "خالد العلي",
    role: "maintenance_manager",
    department: "maintenance",
  },
  {
    employeeNo: "2001",
    fullName: "عمر حسن",
    role: "employee",
    department: "maintenance",
    jobTitle: "فني صيانة",
  },
  {
    employeeNo: "2002",
    fullName: "يوسف كريم",
    role: "employee",
    department: "maintenance",
    jobTitle: "فني كهرباء",
  },
  {
    employeeNo: "3000",
    fullName: "منى سالم",
    role: "production_manager",
    department: "production",
  },
  {
    employeeNo: "3001",
    fullName: "علي محمود",
    role: "employee",
    department: "production",
    jobTitle: "عامل قص",
  },
  {
    employeeNo: "3002",
    fullName: "حسن جواد",
    role: "employee",
    department: "production",
    jobTitle: "عامل تصفيح",
  },
  {
    employeeNo: "3003",
    fullName: "ليلى ناصر",
    role: "employee",
    department: "production",
    jobTitle: "عاملة تغليف",
  },
  {
    employeeNo: "4001",
    fullName: "نادية فؤاد",
    role: "employee",
    department: "quality",
    jobTitle: "مراقبة جودة",
  },
];

async function ensureDepartments(
  client: SupabaseClient,
): Promise<Record<DepartmentKey, string>> {
  const ids = {} as Record<DepartmentKey, string>;
  for (const [key, name] of Object.entries(DEPARTMENTS) as [
    DepartmentKey,
    string,
  ][]) {
    const { data: existing } = await client
      .from("departments")
      .select("id")
      .eq("name", name)
      .maybeSingle();
    if (existing) {
      ids[key] = existing.id;
      continue;
    }
    const { data, error } = await client
      .from("departments")
      .insert({ name })
      .select("id")
      .single();
    if (error) throw error;
    ids[key] = data.id;
  }
  return ids;
}

async function ensureUser(
  client: SupabaseClient,
  user: (typeof DEMO_USERS)[number],
  departmentIds: Record<DepartmentKey, string>,
  demoPassword: string,
): Promise<void> {
  const email = staffEmail(user.employeeNo);
  let userId = await findAuthUserId(client, email);
  if (!userId) {
    const { data, error } = await client.auth.admin.createUser({
      email,
      password: demoPassword,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
  }

  const { data: profile } = await client
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (profile) return;

  const { error: profileError } = await client.from("profiles").insert({
    id: userId,
    full_name: user.fullName,
    role: user.role,
    department_id: user.department ? departmentIds[user.department] : null,
  });
  if (profileError) throw profileError;

  const { error: detailsError } = await client.from("employee_details").insert({
    user_id: userId,
    employee_no: user.employeeNo,
    job_title: user.jobTitle ?? null,
  });
  if (detailsError) throw detailsError;
}

const DEMO_MACHINES: {
  code: string;
  name: string;
  department: DepartmentKey;
  manufacturer: string;
}[] = [
  {
    code: "M-01",
    name: "مقص الألواح",
    department: "production",
    manufacturer: "Haco",
  },
  {
    code: "M-02",
    name: "مكبس التصفيح",
    department: "production",
    manufacturer: "Wemhöner",
  },
  {
    code: "M-03",
    name: "آلة التغليف",
    department: "production",
    manufacturer: "Robopac",
  },
  {
    code: "M-04",
    name: "ضاغط الهواء",
    department: "maintenance",
    manufacturer: "Atlas Copco",
  },
];

async function ensureMachines(
  client: SupabaseClient,
  departmentIds: Record<DepartmentKey, string>,
): Promise<void> {
  for (const machine of DEMO_MACHINES) {
    const { data: existing } = await client
      .from("machines")
      .select("id")
      .eq("code", machine.code)
      .maybeSingle();
    if (existing) continue;
    const { error } = await client.from("machines").insert({
      code: machine.code,
      name: machine.name,
      department_id: departmentIds[machine.department],
      manufacturer: machine.manufacturer,
    });
    if (error) throw error;
  }
}

/** Returns the row's id, inserting it first if no row matches. */
async function ensureRow(
  client: SupabaseClient,
  table: string,
  match: Record<string, string>,
  row: Record<string, unknown>,
): Promise<string> {
  let query = client.from(table).select("id");
  for (const [column, value] of Object.entries(match)) {
    query = query.eq(column, value);
  }
  const { data: existing, error: readError } = await query.maybeSingle();
  if (readError) throw readError;
  if (existing) return (existing as { id: string }).id;
  const { data, error } = await client
    .from(table)
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

async function ensureProductionCatalog(client: SupabaseClient): Promise<void> {
  const spec = (label: string, row: Record<string, unknown>) =>
    ensureRow(client, "spec_definitions", { label }, { label, ...row });
  const thickness = await spec("السماكة", {
    data_type: "number",
    unit: "مم",
    min_value: 1,
    max_value: 50,
    is_required: true,
    sort_order: 1,
  });
  const color = await spec("اللون", {
    data_type: "select",
    options: ["أبيض", "رمادي", "بني"],
    sort_order: 2,
  });
  const moisture = await spec("مقاوم للرطوبة", {
    data_type: "boolean",
    sort_order: 3,
  });
  await spec("ملاحظات التصنيع", { data_type: "text", sort_order: 4 });

  const stage = (name: string, sortOrder: number) =>
    ensureRow(client, "stages", { name }, { name, sort_order: sortOrder });
  const cut = await stage("قص", 1);
  const laminate = await stage("تصفيح", 2);
  const pack = await stage("تغليف", 3);

  const products = [
    {
      code: "MDF-18-W",
      name: "لوح MDF أبيض 18 مم",
      specs: { [thickness]: 18, [color]: "أبيض", [moisture]: false },
      route: [cut, laminate, pack],
    },
    {
      code: "MDF-12-G",
      name: "لوح MDF رمادي 12 مم مقاوم للرطوبة",
      specs: { [thickness]: 12, [color]: "رمادي", [moisture]: true },
      route: [cut, pack],
    },
  ];
  for (const product of products) {
    const productId = await ensureRow(
      client,
      "products",
      { code: product.code },
      {
        code: product.code,
        name: product.name,
        unit: "لوح",
        specs: product.specs,
      },
    );
    const { count } = await client
      .from("product_route_steps")
      .select("seq", { count: "exact", head: true })
      .eq("product_id", productId);
    if (!count) {
      const { error } = await client.from("product_route_steps").insert(
        product.route.map((stageId, index) => ({
          product_id: productId,
          seq: index + 1,
          stage_id: stageId,
        })),
      );
      if (error) throw error;
    }
  }

  const defects: [string, string | null][] = [
    ["كسر في الحافة", cut],
    ["مقاس خاطئ", cut],
    ["فقاعات في التصفيح", laminate],
    ["خدش", laminate],
    ["تلف التغليف", pack],
    ["عيب آخر", null],
  ];
  for (const [name, stageId] of defects) {
    let query = client.from("defect_types").select("id").eq("name", name);
    query = stageId
      ? query.eq("stage_id", stageId)
      : query.is("stage_id", null);
    const { data: existing } = await query.maybeSingle();
    if (existing) continue;
    const { error } = await client
      .from("defect_types")
      .insert({ name, stage_id: stageId });
    if (error) throw error;
  }
}

/**
 * One running order, so the workers' "my stages" screen has something to
 * show. Written directly: the order functions need a signed-in manager.
 */
async function ensureDemoOrder(
  client: SupabaseClient,
  departmentIds: Record<DepartmentKey, string>,
): Promise<void> {
  const DEMO_NOTE = "أمر تجريبي";
  const { data: existing } = await client
    .from("production_orders")
    .select("id")
    .eq("notes", DEMO_NOTE)
    .maybeSingle();
  if (existing) return;

  const { data: product, error: productError } = await client
    .from("products")
    .select("id, unit, route:product_route_steps(seq, stage_id)")
    .eq("code", "MDF-18-W")
    .single();
  if (productError) throw productError;
  const { data: order, error: orderError } = await client
    .from("production_orders")
    .insert({
      product_id: product.id,
      department_id: departmentIds.production,
      quantity: 200,
      unit: product.unit,
      notes: DEMO_NOTE,
    })
    .select("id")
    .single();
  if (orderError) throw orderError;

  const route = [...product.route].sort(
    (a: { seq: number }, b: { seq: number }) => a.seq - b.seq,
  ) as { seq: number; stage_id: string }[];
  const { data: stages, error: stagesError } = await client
    .from("order_stages")
    .insert(
      route.map((step, index) => ({
        order_id: order.id,
        seq: index + 1,
        stage_id: step.stage_id,
      })),
    )
    .select("id, seq");
  if (stagesError) throw stagesError;

  // Cutting, laminating and packing workers, in route order.
  const workerNos = ["3001", "3002", "3003"];
  for (const stage of stages as { id: string; seq: number }[]) {
    const workerNo = workerNos[stage.seq - 1];
    if (!workerNo) continue;
    const { data: details } = await client
      .from("employee_details")
      .select("user_id")
      .eq("employee_no", workerNo)
      .single();
    if (!details) continue;
    const { error } = await client
      .from("order_stage_assignees")
      .insert({ order_stage_id: stage.id, user_id: details.user_id });
    if (error) throw error;
  }
}

const departmentIds = await ensureDepartments(supabase);
for (const user of DEMO_USERS) {
  await ensureUser(supabase, user, departmentIds, password);
}
await ensureMachines(supabase, departmentIds);
await ensureProductionCatalog(supabase);
await ensureDemoOrder(supabase, departmentIds);

console.log(
  `Seeded ${Object.keys(DEPARTMENTS).length} departments and ${DEMO_USERS.length} users (${marker}).`,
);
console.log(
  "Sign in with employee number 1000 (general manager), 2000, 3000, 2001, 3001 ...",
);
