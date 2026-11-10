import { randomInt, randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { employeeNumberToEmail } from "@/lib/auth/staff-email";
import type { Database } from "@/types/database";

export const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const secretKey = process.env.SUPABASE_SECRET_KEY ?? "";

/** Integration tests need a running Supabase; skip them when it is absent. */
export const hasSupabase = Boolean(url && publishableKey && secretKey);

const options = { auth: { persistSession: false, autoRefreshToken: false } };

export function adminClient(): SupabaseClient<Database> {
  return createClient<Database>(url, secretKey, options);
}

export function anonClient(): SupabaseClient<Database> {
  return createClient<Database>(url, publishableKey, options);
}

export const TEST_PASSWORD = `It-${randomUUID().slice(0, 12)}`;

export function randomEmployeeNo(): string {
  return String(randomInt(500_000_000, 999_999_999));
}

export type TestRole = Database["public"]["Enums"]["app_role"];

/** Creates a login account and profile directly (as the service role). */
export async function createTestUser(options: {
  role: TestRole;
  departmentId: string | null;
  active?: boolean;
}): Promise<{ id: string; employeeNo: string }> {
  const admin = adminClient();
  const employeeNo = randomEmployeeNo();
  const { data, error } = await admin.auth.admin.createUser({
    email: employeeNumberToEmail(employeeNo),
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  const id = data.user.id;

  const profile = await admin.from("profiles").insert({
    id,
    full_name: `اختبار ${employeeNo}`,
    role: options.role,
    department_id: options.departmentId,
    is_active: options.active ?? true,
  });
  if (profile.error) throw profile.error;
  const details = await admin
    .from("employee_details")
    .insert({ user_id: id, employee_no: employeeNo });
  if (details.error) throw details.error;
  return { id, employeeNo };
}

export async function createTestDepartment(): Promise<string> {
  const { data, error } = await adminClient()
    .from("departments")
    .insert({ name: `قسم اختبار ${randomUUID().slice(0, 8)}` })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** A client signed in as this employee, using the employee number like the app does. */
export async function signedInClient(
  employeeNo: string,
): Promise<SupabaseClient<Database>> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({
    email: employeeNumberToEmail(employeeNo),
    password: TEST_PASSWORD,
  });
  if (error) throw error;
  return client;
}
