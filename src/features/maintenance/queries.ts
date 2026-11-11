import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { FaultStatus } from "./labels";

const FAULT_COLUMNS =
  "id, number, status, description, machine_stopped, created_at, machine:machines(id, code, name), reporter:profiles!fault_reports_reported_by_fkey(full_name), department:departments(name)";

export async function listMachines({ activeOnly = false } = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("machines")
    .select(
      "id, code, name, status, is_active, manufacturer, model, department:departments(name)",
    )
    .order("code");
  if (activeOnly) query = query.eq("is_active", true).neq("status", "retired");
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getMachine(machineId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("machines")
    .select(
      "id, code, name, status, is_active, manufacturer, model, serial_no, installed_on, notes, department_id",
    )
    .eq("id", machineId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listMachineFaults(machineId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fault_reports")
    .select(`${FAULT_COLUMNS}, resolved_at, resolution_notes, rejection_reason`)
    .eq("machine_id", machineId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}

export async function listFaults(statuses: readonly FaultStatus[]) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fault_reports")
    .select(FAULT_COLUMNS)
    .in("status", [...statuses])
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return data;
}

export async function listMyFaults(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fault_reports")
    .select(FAULT_COLUMNS)
    .eq("reported_by", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}

export async function getFault(faultId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fault_reports")
    .select(
      `${FAULT_COLUMNS}, reported_by, rejection_reason, resolved_at, resolution_notes,
       repairs:tasks!tasks_fault_report_id_fkey(id, number, title, status)`,
    )
    .eq("id", faultId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * The department repair tasks belong to: the viewer's own (the maintenance
 * manager), or for the developer, who has none, the maintenance department.
 */
export async function getRepairDepartment(
  viewerDepartmentId: string | null,
): Promise<string | null> {
  if (viewerDepartmentId) return viewerDepartmentId;
  const supabase = await createClient();
  const { data } = await supabase.rpc("maintenance_department");
  return data ?? null;
}
