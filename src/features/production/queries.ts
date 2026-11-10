import "server-only";

import { createClient } from "@/lib/supabase/server";

const SPEC_COLUMNS =
  "id, label, data_type, unit, options, min_value, max_value, is_required, sort_order, is_active";

export async function listSpecDefinitions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spec_definitions")
    .select(SPEC_COLUMNS)
    .order("sort_order")
    .order("label");
  if (error) throw error;
  return data;
}

export async function listStages({ activeOnly = false } = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("stages")
    .select("id, name, sort_order, is_active")
    .order("sort_order")
    .order("name");
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function listDefectTypes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("defect_types")
    .select("id, name, stage_id, is_active, stage:stages(name)")
    .order("name");
  if (error) throw error;
  return data;
}

type RouteStep = { seq: number; stage: { name: string } | null };

/** "قص ← تصفيح ← تغليف". */
export function routeSummary(steps: readonly RouteStep[]): string {
  return [...steps]
    .sort((a, b) => a.seq - b.seq)
    .map((step) => step.stage?.name ?? "—")
    .join(" ← ");
}

export async function listProducts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, code, name, unit, is_active, route:product_route_steps(seq, stage:stages(name))",
    )
    .order("is_active", { ascending: false })
    .order("code");
  if (error) throw error;
  return data;
}

export async function getProduct(productId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, code, name, unit, specs, notes, is_active, route:product_route_steps(seq, stage_id, stage:stages(name, is_active))",
    )
    .eq("id", productId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    route: [...data.route].sort((a, b) => a.seq - b.seq),
    specs: (data.specs ?? {}) as Record<string, unknown>,
  };
}
