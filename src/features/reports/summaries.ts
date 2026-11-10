import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { Period } from "./period";

async function first<T>(
  promise: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T | null> {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

export async function getTaskSummary(
  period: Period,
  departmentId: string | null,
) {
  const supabase = await createClient();
  return first(
    supabase.rpc("report_task_summary", {
      p_from: period.from,
      p_to: period.to,
      p_department_id: departmentId ?? undefined,
    }),
  );
}

export async function getMaintenanceSummary(period: Period) {
  const supabase = await createClient();
  const [summary, compliance] = await Promise.all([
    first(
      supabase.rpc("report_maintenance_summary", {
        p_from: period.from,
        p_to: period.to,
      }),
    ),
    first(
      supabase.rpc("report_pm_compliance", {
        p_from: period.from,
        p_to: period.to,
      }),
    ),
  ]);
  return { summary, compliance };
}

export async function getProductionSummary(period: Period) {
  const supabase = await createClient();
  return first(
    supabase.rpc("report_production_summary", {
      p_from: period.from,
      p_to: period.to,
    }),
  );
}
