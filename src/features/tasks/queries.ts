import "server-only";

import type { CurrentUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

import type { TaskStatus } from "./labels";
import { isTopRole } from "@/lib/auth/roles";

const LIST_COLUMNS =
  "id, number, kind, title, status, due_at, is_overdue, created_at, department_id, department:departments(name), assignees:task_assignees(user_id, person:profiles(full_name))";

type SortableTask = {
  is_overdue: boolean | null;
  due_at: string | null;
  created_at: string;
};

/** Overdue first, then by due time (none last), then newest. */
export function sortForWork<T extends SortableTask>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    if (Boolean(a.is_overdue) !== Boolean(b.is_overdue))
      return a.is_overdue ? -1 : 1;
    if (a.due_at && b.due_at && a.due_at !== b.due_at)
      return a.due_at < b.due_at ? -1 : 1;
    if (a.due_at && !b.due_at) return -1;
    if (!a.due_at && b.due_at) return 1;
    return a.created_at < b.created_at ? 1 : -1;
  });
}

/** Tasks the viewer manages (all departments for the general manager). */
export async function listManagedTasks(options: {
  statuses: readonly TaskStatus[];
  departmentId?: string | null;
  overdueOnly?: boolean;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("tasks")
    .select(LIST_COLUMNS)
    .in("status", [...options.statuses])
    .order("created_at", { ascending: false })
    .limit(300);
  if (options.departmentId)
    query = query.eq("department_id", options.departmentId);
  const { data, error } = await query;
  if (error) throw error;
  return options.overdueOnly ? data.filter((task) => task.is_overdue) : data;
}

/** Tasks assigned to this user, with their own seen/acknowledged times. */
export async function listMyTasks(
  userId: string,
  statuses: readonly TaskStatus[],
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(
      `${LIST_COLUMNS}, mine:task_assignees!inner(user_id, seen_at, acknowledged_at)`,
    )
    .eq("mine.user_id", userId)
    .in("status", [...statuses])
    .limit(200);
  if (error) throw error;
  return sortForWork(data);
}

/** Handed-in tasks waiting for this manager. */
export async function listPendingApprovals(viewer: CurrentUser) {
  const tasks = await listManagedTasks({ statuses: ["pending_approval"] });
  return tasks.filter((task) =>
    isTopRole(viewer.role) ? true : task.department_id === viewer.departmentId,
  );
}

export async function getTaskDetail(taskId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(
      `id, number, kind, title, description, status, due_at, is_overdue, created_at, submitted_at,
       completed_at, cancel_reason, department_id, assigned_team_id,
       department:departments(name),
       creator:profiles!tasks_created_by_fkey(full_name),
       approver:profiles!tasks_approved_by_fkey(full_name),
       team:teams(name),
       assignees:task_assignees(user_id, seen_at, acknowledged_at, person:profiles(full_name)),
       events:task_events(id, event, from_status, to_status, note, created_at, actor:profiles(full_name))`,
    )
    .eq("id", taskId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    events: [...data.events].sort((a, b) => a.id - b.id),
  };
}

/** People and teams a manager can assign work to, grouped by department. */
export async function getAssignmentOptions(viewer: CurrentUser) {
  const supabase = await createClient();
  const isGm = isTopRole(viewer.role);

  const departmentsQuery = supabase
    .from("departments")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  const { data: departments, error: departmentsError } = isGm
    ? await departmentsQuery
    : await departmentsQuery.eq(
        "id",
        viewer.departmentId ?? "00000000-0000-0000-0000-000000000000",
      );
  if (departmentsError) throw departmentsError;
  const departmentIds = departments.map((department) => department.id);
  if (departmentIds.length === 0)
    return { departments: [], people: [], teams: [] };

  const [
    { data: people, error: peopleError },
    { data: teams, error: teamsError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, department_id")
      .eq("is_active", true)
      .in("department_id", departmentIds)
      .order("full_name"),
    supabase
      .from("teams")
      .select("id, name, department_id")
      .eq("is_active", true)
      .in("department_id", departmentIds)
      .order("name"),
  ]);
  if (peopleError) throw peopleError;
  if (teamsError) throw teamsError;
  return { departments, people, teams };
}
