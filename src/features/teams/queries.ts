import "server-only";

import type { CurrentUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { isTopRole } from "@/lib/auth/roles";

/** Teams the viewer manages, with their members. */
export async function listManagedTeams(viewer: CurrentUser) {
  const supabase = await createClient();
  let query = supabase
    .from("teams")
    .select(
      "id, name, is_active, department_id, department:departments(name), members:team_members(user_id)",
    )
    .order("is_active", { ascending: false })
    .order("name");
  if (!isTopRole(viewer.role)) {
    if (!viewer.departmentId) return [];
    query = query.eq("department_id", viewer.departmentId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** Active people of the given departments (to pick team members and assignees). */
export async function listActivePeople(departmentIds: string[]) {
  if (departmentIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, department_id")
    .eq("is_active", true)
    .in("department_id", departmentIds)
    .order("full_name");
  if (error) throw error;
  return data;
}
