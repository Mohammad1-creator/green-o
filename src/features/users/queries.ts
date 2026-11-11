import "server-only";

import type { CurrentUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { isTopRole } from "@/lib/auth/roles";

const USER_COLUMNS =
  "id, full_name, role, is_active, department_id, department:departments(name), details:employee_details(employee_no, phone, job_title, notes)";

/** Everyone the viewer manages: all users for the general manager, own department otherwise. */
export async function listManagedUsers(viewer: CurrentUser) {
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select(USER_COLUMNS)
    .order("is_active", { ascending: false })
    .order("full_name");

  if (!isTopRole(viewer.role)) {
    if (!viewer.departmentId) return [];
    query = query.eq("department_id", viewer.departmentId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getUserForEdit(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(USER_COLUMNS)
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listDepartments({ activeOnly = false } = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("departments")
    .select("id, name, is_active")
    .order("name");
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function canManageAccount(
  departmentId: string | null,
  role: CurrentUser["role"],
) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("can_manage_account", {
    p_department_id: departmentId as string,
    p_role: role,
  });
  return data === true;
}
