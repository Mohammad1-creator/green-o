import "server-only";

import { createClient } from "@/lib/supabase/server";
import { dateToZonedLocal } from "@/lib/zoned-time";

import type { ViolationStatus } from "./labels";

const LIST_COLUMNS =
  "id, number, status, severity, points, description, occurred_at, created_at, type:violation_types(name), employee:profiles!violations_employee_id_fkey(full_name), recorder:profiles!violations_recorded_by_fkey(full_name), department:departments(name)";

const DETAIL_COLUMNS =
  "id, number, status, severity, points, description, location, occurred_at, created_at, responded_at, objection, decided_at, decision_note, employee_id, recorded_by, type:violation_types(name), employee:profiles!violations_employee_id_fkey(full_name), recorder:profiles!violations_recorded_by_fkey(full_name), decider:profiles!violations_decided_by_fkey(full_name), department:departments(name)";

export async function listViolationTypes({ activeOnly = false } = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("violation_types")
    .select("id, name, severity, points, description, is_active")
    .order("is_active", { ascending: false })
    .order("name");
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** Violations against this person, newest first. */
export async function listMyViolations(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("violations")
    .select(LIST_COLUMNS)
    .eq("employee_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}

/** Violations this person recorded, newest first. */
export async function listRecordedViolations(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("violations")
    .select(LIST_COLUMNS)
    .eq("recorded_by", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export async function countPendingViolations(userId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("violations")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", userId)
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}

/** Whether this person has ever had a violation (for the phone's tab bar). */
export async function hasViolations(userId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("violations")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", userId);
  return (count ?? 0) > 0;
}

/** Every violation the viewer may see (row level security decides). */
export async function listViolations(status: ViolationStatus | null) {
  const supabase = await createClient();
  let query = supabase
    .from("violations")
    .select(LIST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(300);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getViolation(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("violations")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Everyone a violation can be recorded against, but the viewer. */
export async function listViolationTargets(viewerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, department:departments(name)")
    .eq("is_active", true)
    .neq("id", viewerId)
    .order("full_name");
  if (error) throw error;
  return data;
}

export type ViolationListItem = Awaited<
  ReturnType<typeof listViolations>
>[number];
export type ViolationDetail = NonNullable<
  Awaited<ReturnType<typeof getViolation>>
>;

/** Now, as "YYYY-MM-DDTHH:mm" in factory time, for the form's default. */
export function nowInFactory(timeZone: string): string {
  return dateToZonedLocal(new Date().toISOString(), timeZone);
}
