import "server-only";

import {
  type AppRole,
  MAINTENANCE_ROLES,
  MANAGER_ROLES,
  PRODUCTION_ROLES,
  TOP_ROLES,
} from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

import type { Period } from "./period";

export type ColumnType = "text" | "count" | "quantity" | "hours" | "percent";

export type ReportRow = Record<string, string | number | null>;

export type ReportColumn = {
  key: string;
  label: string;
  type: ColumnType;
};

export type ReportDefinition = {
  title: string;
  roles: readonly AppRole[];
  columns: ReportColumn[];
  fetch: (input: {
    period: Period;
    departmentId: string | null;
  }) => Promise<ReportRow[]>;
};

const ALL_MANAGERS = MANAGER_ROLES;
const MAINTENANCE = MAINTENANCE_ROLES;
const PRODUCTION = PRODUCTION_ROLES;

/** a / b, or null when b is zero. */
export function ratio(a: number, b: number): number | null {
  return b > 0 ? a / b : null;
}

async function rpc<T>(
  call: (
    client: Awaited<ReturnType<typeof createClient>>,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const supabase = await createClient();
  const { data, error } = await call(supabase);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export const REPORTS = {
  "tasks-by-department": {
    title: "المهام حسب القسم",
    roles: TOP_ROLES,
    columns: [
      { key: "department_name", label: "القسم", type: "text" },
      { key: "total", label: "المهام", type: "count" },
      { key: "completed", label: "مكتملة", type: "count" },
      { key: "on_time_rate", label: "في الموعد", type: "percent" },
      { key: "overdue", label: "متأخرة الآن", type: "count" },
      {
        key: "avg_completion_hours",
        label: "متوسط الإنجاز (ساعة)",
        type: "hours",
      },
    ],
    fetch: async ({ period }) =>
      (
        await rpc((client) =>
          client.rpc("report_tasks_by_department", {
            p_from: period.from,
            p_to: period.to,
          }),
        )
      ).map((row) => ({
        ...row,
        on_time_rate: ratio(row.completed_on_time, row.completed),
      })),
  },
  "tasks-by-person": {
    title: "المهام حسب الموظف",
    roles: ALL_MANAGERS,
    columns: [
      { key: "full_name", label: "الموظف", type: "text" },
      { key: "department_name", label: "القسم", type: "text" },
      { key: "assigned", label: "المسندة", type: "count" },
      { key: "completed", label: "مكتملة", type: "count" },
      { key: "on_time_rate", label: "في الموعد", type: "percent" },
      { key: "overdue", label: "متأخرة الآن", type: "count" },
      { key: "returned", label: "مرات الإعادة", type: "count" },
    ],
    fetch: async ({ period, departmentId }) =>
      (
        await rpc((client) =>
          client.rpc("report_tasks_by_person", {
            p_from: period.from,
            p_to: period.to,
            p_department_id: departmentId ?? undefined,
          }),
        )
      ).map((row) => ({
        ...row,
        on_time_rate: ratio(row.completed_on_time, row.completed),
      })),
  },
  "points-by-person": {
    title: "ترتيب الموظفين بالنقاط",
    roles: ALL_MANAGERS,
    columns: [
      { key: "rank", label: "الترتيب", type: "count" },
      { key: "full_name", label: "الموظف", type: "text" },
      { key: "department_name", label: "القسم", type: "text" },
      { key: "points", label: "النقاط", type: "count" },
      { key: "tasks", label: "المهام", type: "count" },
    ],
    fetch: async ({ period, departmentId }) =>
      (
        await rpc((client) =>
          client.rpc("report_points_by_person", {
            p_from: period.from,
            p_to: period.to,
            p_department_id: departmentId ?? undefined,
          }),
        )
      ).map((row, _index, rows) => ({
        // Rows come highest first; equal points share a rank: 1, 2, 2, 4.
        rank: rows.findIndex((other) => other.points === row.points) + 1,
        full_name: row.full_name,
        department_name: row.department_name,
        points: row.points,
        tasks: row.tasks,
      })),
  },
  "tasks-by-team": {
    title: "المهام حسب الفريق",
    roles: ALL_MANAGERS,
    columns: [
      { key: "team_name", label: "الفريق", type: "text" },
      { key: "department_name", label: "القسم", type: "text" },
      { key: "total", label: "المهام", type: "count" },
      { key: "completed", label: "مكتملة", type: "count" },
      { key: "on_time_rate", label: "في الموعد", type: "percent" },
      { key: "overdue", label: "متأخرة الآن", type: "count" },
    ],
    fetch: async ({ period, departmentId }) =>
      (
        await rpc((client) =>
          client.rpc("report_tasks_by_team", {
            p_from: period.from,
            p_to: period.to,
            p_department_id: departmentId ?? undefined,
          }),
        )
      ).map((row) => ({
        ...row,
        on_time_rate: ratio(row.completed_on_time, row.completed),
      })),
  },
  "faults-by-machine": {
    title: "الأعطال حسب الآلة",
    roles: MAINTENANCE,
    columns: [
      { key: "code", label: "الرمز", type: "text" },
      { key: "name", label: "الآلة", type: "text" },
      { key: "faults", label: "البلاغات", type: "count" },
      { key: "stopped", label: "أوقفت الآلة", type: "count" },
      { key: "downtime_hours", label: "مدة التوقف (ساعة)", type: "hours" },
      { key: "avg_repair_hours", label: "متوسط الإصلاح (ساعة)", type: "hours" },
    ],
    fetch: ({ period }) =>
      rpc((client) =>
        client.rpc("report_faults_by_machine", {
          p_from: period.from,
          p_to: period.to,
        }),
      ),
  },
  "production-by-stage": {
    title: "الإنتاج حسب المرحلة",
    roles: PRODUCTION,
    columns: [
      { key: "stage_name", label: "المرحلة", type: "text" },
      { key: "good_qty", label: "سليم", type: "quantity" },
      { key: "defect_qty", label: "معيب", type: "quantity" },
      { key: "defect_rate", label: "نسبة العيوب", type: "percent" },
      { key: "waiting_qty", label: "منتظر الآن", type: "quantity" },
    ],
    fetch: async ({ period }) =>
      (
        await rpc((client) =>
          client.rpc("report_production_by_stage", {
            p_from: period.from,
            p_to: period.to,
          }),
        )
      ).map((row) => ({
        ...row,
        defect_rate: ratio(row.defect_qty, row.good_qty + row.defect_qty),
      })),
  },
  "production-by-product": {
    title: "الإنتاج حسب المنتج",
    roles: PRODUCTION,
    columns: [
      { key: "code", label: "الرمز", type: "text" },
      { key: "name", label: "المنتج", type: "text" },
      { key: "unit", label: "الوحدة", type: "text" },
      { key: "finished_qty", label: "منتهٍ (آخر مرحلة)", type: "quantity" },
      { key: "defect_qty", label: "معيب (كل المراحل)", type: "quantity" },
    ],
    fetch: ({ period }) =>
      rpc((client) =>
        client.rpc("report_production_by_product", {
          p_from: period.from,
          p_to: period.to,
        }),
      ),
  },
  "production-by-worker": {
    title: "الإنتاج حسب العامل",
    roles: PRODUCTION,
    columns: [
      { key: "full_name", label: "العامل", type: "text" },
      { key: "entries", label: "الإدخالات", type: "count" },
      { key: "good_qty", label: "سليم", type: "quantity" },
      { key: "defect_qty", label: "معيب", type: "quantity" },
      { key: "defect_rate", label: "نسبة العيوب", type: "percent" },
    ],
    fetch: async ({ period }) =>
      (
        await rpc((client) =>
          client.rpc("report_production_by_worker", {
            p_from: period.from,
            p_to: period.to,
          }),
        )
      ).map((row) => ({
        ...row,
        defect_rate: ratio(row.defect_qty, row.good_qty + row.defect_qty),
      })),
  },
  "defects-by-type": {
    title: "العيوب حسب النوع",
    roles: PRODUCTION,
    columns: [
      { key: "name", label: "نوع العيب", type: "text" },
      { key: "stage_name", label: "المرحلة", type: "text" },
      { key: "entries", label: "الإدخالات", type: "count" },
      { key: "defect_qty", label: "الكمية", type: "quantity" },
    ],
    fetch: ({ period }) =>
      rpc((client) =>
        client.rpc("report_defects_by_type", {
          p_from: period.from,
          p_to: period.to,
        }),
      ),
  },
} satisfies Record<string, ReportDefinition>;

export type ReportKey = keyof typeof REPORTS;

export function isReportKey(value: string): value is ReportKey {
  return value in REPORTS;
}

export function canSeeReport(role: AppRole, key: ReportKey): boolean {
  return (REPORTS[key].roles as readonly AppRole[]).includes(role);
}
