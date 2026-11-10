import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";

import { PageSkeleton } from "@/components/page-skeleton";
import { PrintButton } from "@/features/reports/components/print-button";
import { periodLabel } from "@/features/reports/components/report-parts";
import { ReportSections } from "@/features/reports/components/report-sections";
import { parsePeriod } from "@/features/reports/period";
import { requireManager } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/format";
import { getFactorySettings } from "@/lib/settings";
import { zonedToday } from "@/lib/zoned-time";

export const metadata: Metadata = {
  title: "تقرير للطباعة",
};

export default function PrintReportsPage({
  searchParams,
}: PageProps<"/print/reports">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PrintReports searchParams={searchParams} />
    </Suspense>
  );
}

async function PrintReports({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireManager();
  const [query, settings] = await Promise.all([
    searchParams,
    getFactorySettings(),
  ]);
  const period = parsePeriod(query, zonedToday(settings.timeZone));
  const departmentParam = z.uuid().safeParse(query.department);
  const departmentId =
    viewer.role === "general_manager" && departmentParam.success
      ? departmentParam.data
      : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">تقرير {settings.factoryName}</h1>
          <p className="text-sm text-muted-foreground">{periodLabel(period)}</p>
          <p className="text-xs text-muted-foreground">
            أعدّه {viewer.fullName} في{" "}
            {formatDateTime(new Date(), settings.timeZone)}
          </p>
        </div>
        <PrintButton />
      </header>
      <ReportSections
        viewer={viewer}
        period={period}
        departmentId={departmentId}
        printable
      />
    </div>
  );
}
