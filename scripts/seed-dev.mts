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

const departmentIds = await ensureDepartments(supabase);
for (const user of DEMO_USERS) {
  await ensureUser(supabase, user, departmentIds, password);
}
await ensureMachines(supabase, departmentIds);

console.log(
  `Seeded ${Object.keys(DEPARTMENTS).length} departments and ${DEMO_USERS.length} users (${marker}).`,
);
console.log(
  "Sign in with employee number 1000 (general manager), 2000, 3000, 2001, 3001 ...",
);
