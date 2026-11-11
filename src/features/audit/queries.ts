import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { AuditFilters } from "./filters";

export async function listAuditEntries(filters: AuditFilters, limit = 50) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_audit_log", {
    p_from: filters.from ?? undefined,
    p_to: filters.to ?? undefined,
    p_actor_id: filters.actorId ?? undefined,
    p_table: filters.table ?? undefined,
    p_action: filters.action ?? undefined,
    p_record_id: filters.recordId ?? undefined,
    p_before_id: filters.beforeId ?? undefined,
    p_limit: limit,
  });
  if (error) throw error;
  return data.map((entry) => ({
    ...entry,
    old_data: entry.old_data as Record<string, unknown> | null,
    new_data: entry.new_data as Record<string, unknown> | null,
  }));
}

export type AuditEntry = Awaited<ReturnType<typeof listAuditEntries>>[number];

/** Up to `max` entries, newest first, in pages of 1000 (the API's limit). */
export async function listAllAuditEntries(filters: AuditFilters, max: number) {
  const entries: AuditEntry[] = [];
  let beforeId = filters.beforeId;
  while (entries.length < max) {
    const page = await listAuditEntries({ ...filters, beforeId }, 1000);
    entries.push(...page);
    const last = page.at(-1);
    if (page.length < 1000 || !last) break;
    beforeId = last.id;
  }
  return entries.slice(0, max);
}

export async function getChainStatus() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("audit_chain_status");
  if (error) throw error;
  return data[0] ?? null;
}

export async function listAuditTables() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("audit_tables");
  if (error) throw error;
  return data;
}

export async function listPeople() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name");
  if (error) throw error;
  return data;
}
