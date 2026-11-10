import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import type { Json } from "@/types/database";

import {
  adminClient,
  createTestDepartment,
  createTestUser,
  hasSupabase,
  signedInClient,
} from "./helpers";

/** Values for whatever specifications are required right now. */
async function requiredSpecs(): Promise<{ [key: string]: Json | undefined }> {
  const { data, error } = await adminClient()
    .from("spec_definitions")
    .select("id, data_type, options, min_value")
    .eq("is_active", true)
    .eq("is_required", true);
  if (error) throw error;
  return Object.fromEntries(
    data.map((spec) => [
      spec.id,
      spec.data_type === "number"
        ? (spec.min_value ?? 1)
        : spec.data_type === "select"
          ? spec.options?.[0]
          : spec.data_type === "boolean"
            ? true
            : "اختبار",
    ]),
  );
}

describe.skipIf(!hasSupabase)("recording quantities at the same moment", () => {
  let orderStageId: string;
  let workers: Awaited<ReturnType<typeof signedInClient>>[];

  beforeAll(async () => {
    const admin = adminClient();
    const department = await createTestDepartment();
    const manager = await createTestUser({
      role: "production_manager",
      departmentId: department,
    });
    const workerA = await createTestUser({
      role: "employee",
      departmentId: department,
    });
    const workerB = await createTestUser({
      role: "employee",
      departmentId: department,
    });

    // A one-stage product, set up directly as the service role.
    const tag = randomUUID().slice(0, 8);
    const stage = await admin
      .from("stages")
      .insert({ name: `مرحلة اختبار ${tag}` })
      .select("id")
      .single();
    if (stage.error) throw stage.error;
    const product = await admin
      .from("products")
      .insert({
        code: `IT-${tag}`,
        name: `منتج اختبار ${tag}`,
        unit: "قطعة",
        specs: await requiredSpecs(),
      })
      .select("id")
      .single();
    if (product.error) throw product.error;
    const route = await admin.from("product_route_steps").insert({
      product_id: product.data.id,
      seq: 1,
      stage_id: stage.data.id,
    });
    if (route.error) throw route.error;

    // The manager creates an order of 100 and assigns both workers.
    const managerClient = await signedInClient(manager.employeeNo);
    const order = await managerClient.rpc("create_production_order", {
      p_product_id: product.data.id,
      p_quantity: 100,
    });
    if (order.error) throw order.error;
    const orderStage = await managerClient
      .from("order_stages")
      .select("id")
      .eq("order_id", order.data)
      .single();
    if (orderStage.error) throw orderStage.error;
    orderStageId = orderStage.data.id;
    const assigned = await managerClient.rpc("assign_stage_workers", {
      p_order_stage_id: orderStageId,
      p_user_ids: [workerA.id, workerB.id],
    });
    if (assigned.error) throw assigned.error;

    workers = await Promise.all([
      signedInClient(workerA.employeeNo),
      signedInClient(workerB.employeeNo),
    ]);
  });

  it("never lets parallel entries exceed the stage's input", async () => {
    // Eight entries of 15 at once, from two workers: only six fit in 100.
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        workers[index % 2]!.rpc("record_stage_entry", {
          p_order_stage_id: orderStageId,
          p_good_qty: 15,
        }),
      ),
    );
    const accepted = results.filter((result) => !result.error);
    const refused = results.filter((result) => result.error);
    expect(accepted).toHaveLength(6);
    expect(refused).toHaveLength(2);
    for (const result of refused) {
      expect(result.error?.message).toContain("الكمية أكبر من المتاح");
    }

    const { data, error } = await adminClient()
      .from("order_stages")
      .select("good_qty")
      .eq("id", orderStageId)
      .single();
    expect(error).toBeNull();
    expect(data?.good_qty).toBe(90);
  });
});
