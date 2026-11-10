import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { OrderStatus } from "./order-labels";

const ORDER_COLUMNS =
  "id, number, quantity, unit, due_date, status, created_at, completed_at, product:products(id, code, name)";

export async function listOrders(statuses: readonly OrderStatus[]) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_orders")
    .select(
      `${ORDER_COLUMNS}, stages:order_stages(seq, status, good_qty, defect_qty, stage:stages(name))`,
    )
    .in("status", [...statuses])
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return data.map((order) => ({
    ...order,
    stages: [...order.stages].sort((a, b) => a.seq - b.seq),
  }));
}

export async function getOrder(orderId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_orders")
    .select(
      `${ORDER_COLUMNS}, department_id, notes, cancel_reason, cancelled_at,
       stages:order_stages(id, seq, status, good_qty, defect_qty, input_qty, available_qty, closed_at, stage_id,
         stage:stages(name),
         assignees:order_stage_assignees(user_id, profile:profiles(full_name)))`,
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    stages: [...data.stages].sort((a, b) => a.seq - b.seq),
  };
}

export async function listOrderEntries(stageIds: readonly string[]) {
  if (stageIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stage_entries")
    .select(
      `id, order_stage_id, good_qty, defect_qty, note, created_at, voided_at, void_reason,
       worker:profiles!stage_entries_worker_id_fkey(full_name),
       recorder:profiles!stage_entries_recorded_by_fkey(full_name),
       defect:defect_types(name)`,
    )
    .in("order_stage_id", [...stageIds])
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data;
}

/** Products an order can be created for: active, with a route. */
export async function listOrderableProducts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, code, name, unit, route:product_route_steps(seq, stage:stages(name, is_active))",
    )
    .eq("is_active", true)
    .order("code");
  if (error) throw error;
  return data
    .map((product) => ({
      ...product,
      route: [...product.route].sort((a, b) => a.seq - b.seq),
    }))
    .filter(
      (product) =>
        product.route.length > 0 &&
        product.route.every((step) => step.stage?.is_active),
    );
}

/** Active people of a department, for stage assignment. */
export async function listDepartmentWorkers(departmentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("department_id", departmentId)
    .eq("is_active", true)
    .order("full_name");
  if (error) throw error;
  return data;
}

const MY_STAGE_COLUMNS = `id, seq, status, good_qty, defect_qty, input_qty, available_qty, stage_id,
  stage:stages(name),
  order:production_orders!inner(id, number, quantity, unit, due_date, status, product:products(name))`;

/** The open stages a worker is assigned to, on orders still running. */
export async function listMyStages(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("order_stages")
    .select(`${MY_STAGE_COLUMNS}, me:order_stage_assignees!inner(user_id)`)
    .eq("me.user_id", userId)
    .neq("status", "closed")
    .in("order.status", ["open", "in_progress"])
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** True when the person has production work to do (for the bottom bar). */
export async function hasProductionWork(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("order_stage_assignees")
    .select(
      "order_stage_id, stage:order_stages!inner(status, order:production_orders!inner(status))",
      { count: "exact", head: true },
    )
    .eq("user_id", userId)
    .neq("stage.status", "closed")
    .in("stage.order.status", ["open", "in_progress"]);
  if (error) return false;
  return (count ?? 0) > 0;
}

export async function getMyStage(orderStageId: string, userId: string) {
  const supabase = await createClient();
  const [{ data: stage, error }, { data: entries, error: entriesError }] =
    await Promise.all([
      supabase
        .from("order_stages")
        .select(`${MY_STAGE_COLUMNS}, assignees:order_stage_assignees(user_id)`)
        .eq("id", orderStageId)
        .maybeSingle(),
      supabase
        .from("stage_entries")
        .select(
          "id, good_qty, defect_qty, note, created_at, voided_at, void_reason, defect:defect_types(name)",
        )
        .eq("order_stage_id", orderStageId)
        .eq("worker_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
  if (error) throw error;
  if (entriesError) throw entriesError;
  return stage ? { stage, entries } : null;
}

/** Defect types that apply to a stage: its own and the general ones. */
export async function listStageDefectTypes(stageId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("defect_types")
    .select("id, name, stage_id")
    .eq("is_active", true)
    .or(`stage_id.eq.${stageId},stage_id.is.null`)
    .order("name");
  if (error) throw error;
  return data;
}
