import type { CurrentUser } from "@/lib/auth/dal";
import { formatNumber, formatPercent } from "@/lib/format";

import {
  canSeeReport,
  ratio,
  REPORTS,
  type ReportKey,
  type ReportRow,
} from "../definitions";
import { formatCell } from "../format-cell";
import { type Period, periodQuery } from "../period";
import {
  getMaintenanceSummary,
  getProductionSummary,
  getTaskSummary,
} from "../summaries";

import { KpiRow, RankedBars, ReportTable } from "./report-parts";
import { MAINTENANCE_ROLES, PRODUCTION_ROLES } from "@/lib/auth/roles";

const percentOrDash = (value: number | null) =>
  value === null ? "—" : formatPercent(value);
const hoursOrDash = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : formatCell("hours", value);

async function load(
  keys: ReportKey[],
  viewer: CurrentUser,
  input: { period: Period; departmentId: string | null },
): Promise<Partial<Record<ReportKey, ReportRow[]>>> {
  const visible = keys.filter((key) => canSeeReport(viewer.role, key));
  const rows = await Promise.all(
    visible.map((key) => REPORTS[key].fetch(input)),
  );
  return Object.fromEntries(visible.map((key, index) => [key, rows[index]]));
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="space-y-5 rounded-xl border p-5 print:border-0 print:p-0"
    >
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

/** Every section the viewer may see, for the reports and the print page. */
export async function ReportSections({
  viewer,
  period,
  departmentId,
  printable = false,
}: {
  viewer: CurrentUser;
  period: Period;
  departmentId: string | null;
  printable?: boolean;
}) {
  const input = { period, departmentId };
  const showMaintenance = MAINTENANCE_ROLES.includes(viewer.role);
  const showProduction = PRODUCTION_ROLES.includes(viewer.role);

  const [tasks, maintenance, production, tables] = await Promise.all([
    getTaskSummary(period, departmentId),
    showMaintenance ? getMaintenanceSummary(period) : Promise.resolve(null),
    showProduction ? getProductionSummary(period) : Promise.resolve(null),
    load(
      [
        "tasks-by-department",
        "tasks-by-person",
        "tasks-by-team",
        "faults-by-machine",
        "production-by-stage",
        "production-by-product",
        "production-by-worker",
        "defects-by-type",
      ],
      viewer,
      input,
    ),
  ]);
  const exportQuery = printable
    ? null
    : periodQuery(period, { department: departmentId ?? undefined });

  const table = (key: ReportKey) =>
    tables[key] ? (
      <ReportTable
        report={key}
        title={REPORTS[key].title}
        columns={REPORTS[key].columns}
        rows={tables[key]}
        exportQuery={exportQuery}
      />
    ) : null;

  return (
    <div className="space-y-6">
      <Section title="المهام">
        <KpiRow
          label="مؤشرات المهام"
          tiles={[
            {
              label: "المهام الجديدة في الفترة",
              value: formatNumber(tasks?.total ?? 0),
              hint: `مفتوحة ${formatNumber(tasks?.open ?? 0)} · بانتظار الاعتماد ${formatNumber(tasks?.pending_approval ?? 0)}`,
            },
            {
              label: "أُنجزت في موعدها",
              value: percentOrDash(
                ratio(tasks?.completed_on_time ?? 0, tasks?.completed ?? 0),
              ),
              hint: `من ${formatNumber(tasks?.completed ?? 0)} مكتملة`,
            },
            {
              label: "متأخرة الآن",
              value: formatNumber(tasks?.overdue ?? 0),
              hint: `مرات الإعادة للمتابعة: ${formatNumber(tasks?.returned ?? 0)}`,
            },
            {
              label: "متوسط زمن الإنجاز",
              value: hoursOrDash(tasks?.avg_completion_hours),
              hint: "ساعة، من الإنشاء إلى الاعتماد",
            },
          ]}
        />
        {table("tasks-by-department")}
        {table("tasks-by-person")}
        {table("tasks-by-team")}
      </Section>

      {maintenance ? (
        <Section title="الصيانة">
          <KpiRow
            label="مؤشرات الصيانة"
            tiles={[
              {
                label: "بلاغات الفترة",
                value: formatNumber(maintenance.summary?.reported ?? 0),
                hint: `مفتوحة الآن ${formatNumber(maintenance.summary?.open_now ?? 0)}`,
              },
              {
                label: "متوسط زمن الاستجابة",
                value: hoursOrDash(maintenance.summary?.avg_response_hours),
                hint: "ساعة، من البلاغ إلى إسناد الإصلاح",
              },
              {
                label: "متوسط زمن الإصلاح",
                value: hoursOrDash(maintenance.summary?.avg_repair_hours),
                hint: `ساعة · مدة التوقف ${hoursOrDash(maintenance.summary?.downtime_hours)} ساعة`,
              },
              {
                label: "الالتزام بالصيانة الوقائية",
                value: percentOrDash(
                  ratio(
                    maintenance.compliance?.on_time ?? 0,
                    maintenance.compliance?.due ?? 0,
                  ),
                ),
                hint: `من ${formatNumber(maintenance.compliance?.due ?? 0)} مهمة حلّ موعدها`,
              },
            ]}
          />
          {tables["faults-by-machine"] ? (
            <RankedBars
              label="أكثر الآلات أعطالاً"
              items={tables["faults-by-machine"].map((row) => ({
                label: String(row.name),
                value: Number(row.faults),
                display: formatNumber(Number(row.faults)),
              }))}
            />
          ) : null}
          {table("faults-by-machine")}
        </Section>
      ) : null}

      {production ? (
        <Section title="الإنتاج">
          <KpiRow
            label="مؤشرات الإنتاج"
            tiles={[
              {
                label: "أوامر جارية",
                value: formatNumber(production.orders_running),
                hint: `متأخرة عن التسليم ${formatNumber(production.orders_late)}`,
              },
              {
                label: "أوامر اكتملت في الفترة",
                value: formatNumber(production.orders_completed),
              },
              {
                label: "سليم (كل المراحل)",
                value: formatNumber(production.good_qty),
                hint: `معيب ${formatNumber(production.defect_qty)}`,
              },
              {
                label: "نسبة العيوب",
                value: percentOrDash(
                  ratio(
                    production.defect_qty,
                    production.good_qty + production.defect_qty,
                  ),
                ),
              },
            ]}
          />
          {table("production-by-stage")}
          {table("production-by-product")}
          {tables["defects-by-type"] ? (
            <RankedBars
              label="أكثر العيوب"
              items={tables["defects-by-type"].map((row) => ({
                label: String(row.name),
                value: Number(row.defect_qty),
                display: formatNumber(Number(row.defect_qty)),
              }))}
            />
          ) : null}
          {table("defects-by-type")}
          {table("production-by-worker")}
        </Section>
      ) : null}
    </div>
  );
}
