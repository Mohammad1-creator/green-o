import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import {
  PeriodFilter,
  periodLabel,
  RankedBars,
  ReportTable,
} from "@/features/reports/components/report-parts";
import { REPORTS } from "@/features/reports/definitions";
import { parsePeriod, periodQuery } from "@/features/reports/period";
import { listDepartments } from "@/features/users/queries";
import { requireManager } from "@/lib/auth/dal";
import { formatNumber } from "@/lib/format";
import { getFactorySettings } from "@/lib/settings";
import { zonedToday } from "@/lib/zoned-time";
import { isTopRole } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "النقاط",
};

export default function PointsPage({
  searchParams,
}: PageProps<"/admin/points">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Points searchParams={searchParams} />
    </Suspense>
  );
}

async function Points({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireManager();
  const [query, settings] = await Promise.all([
    searchParams,
    getFactorySettings(),
  ]);
  const today = zonedToday(settings.timeZone);
  const period = parsePeriod(query, today);
  const isGm = isTopRole(viewer.role);
  const departmentParam = z.uuid().safeParse(query.department);
  const departmentId =
    isGm && departmentParam.success ? departmentParam.data : null;
  const report = REPORTS["points-by-person"];
  const [rows, departments] = await Promise.all([
    report.fetch({ period, departmentId }),
    isGm ? listDepartments({ activeOnly: true }) : Promise.resolve(undefined),
  ]);

  return (
    <>
      <PageHeader
        title="النقاط"
        description={`${periodLabel(period)}. النقاط تُمنح من صفحة المهمة بعد اكتمالها، والملغاة لا تُحسب.`}
      />
      <div className="space-y-6">
        <PeriodFilter
          action="/admin/points"
          period={period}
          today={today}
          departments={departments}
          departmentId={departmentId}
        />
        <section className="space-y-5 rounded-xl border p-5">
          <RankedBars
            label="الأعلى نقاطاً"
            items={rows.map((row) => ({
              label: String(row.full_name),
              value: Number(row.points),
              display: formatNumber(Number(row.points)),
            }))}
          />
          <ReportTable
            report="points-by-person"
            title={report.title}
            columns={report.columns}
            rows={rows}
            exportQuery={periodQuery(period, {
              department: departmentId ?? undefined,
            })}
          />
        </section>
      </div>
    </>
  );
}
