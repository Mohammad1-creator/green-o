import "server-only";

import { createClient } from "@/lib/supabase/server";

const PLAN_COLUMNS =
  "id, title, interval_unit, interval_count, start_date, next_due_date, lead_days, is_active, last_generated_at, department_id, machine:machines(id, code, name), assignee:profiles!pm_plans_assignee_user_id_fkey(full_name), team:teams!pm_plans_assignee_team_id_fkey(name)";

/** Active plans first, each group by its next due date. */
export async function listPmPlans({ machineId }: { machineId?: string } = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("pm_plans")
    .select(PLAN_COLUMNS)
    .order("is_active", { ascending: false })
    .order("next_due_date");
  if (machineId) query = query.eq("machine_id", machineId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getPmPlan(planId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pm_plans")
    .select(
      `${PLAN_COLUMNS}, instructions, machine_id, assignee_user_id, assignee_team_id`,
    )
    .eq("id", planId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** The tasks a plan has created, newest occurrence first. */
export async function listPmPlanTasks(planId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, number, status, pm_due_date, due_at, submitted_at")
    .eq("pm_plan_id", planId)
    .order("pm_due_date", { ascending: false })
    .limit(60);
  if (error) throw error;
  return data;
}

/** Preventive tasks due on or after `from` and before `before` (dates). */
export async function listPmOutcomes(from: string, before: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("status, due_at, submitted_at")
    .eq("kind", "preventive")
    .gte("pm_due_date", from)
    .lt("pm_due_date", before)
    .limit(5000);
  if (error) throw error;
  return data;
}
