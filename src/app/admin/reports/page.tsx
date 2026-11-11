import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { buttonVariants } from "@/components/ui/button";
import {
  PeriodFilter,
  periodLabel,
} from "@/features/reports/components/report-parts";
import { ReportSections } from "@/features/reports/components/report-sections";
import { parsePeriod, periodQuery } from "@/features/reports/period";
import { listDepartments } from "@/features/users/queries";
import { requireManager } from "@/lib/auth/dal";
import { getFactorySettings } from "@/lib/settings";
import { zonedToday } from "@/lib/zoned-time";
import { isTopRole } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "التقارير",
};

export default function ReportsPage({
  searchParams,
}: PageProps<"/admin/reports">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Reports searchParams={searchParams} />
    </Suspense>
  );
}

async function Reports({
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
  const departments = isGm
    ? await listDepartments({ activeOnly: true })
    : undefined;

  return (
    <>
      <PageHeader
        title="التقارير"
        description={`${periodLabel(period)}. الأرقام تشمل ما تسمح به صلاحياتك فقط.`}
        actions={
          <Link
            href={`/print/reports?${periodQuery(period, {
              department: departmentId ?? undefined,
            })}`}
            target="_blank"
            className={buttonVariants({ variant: "outline" })}
          >
            نسخة للطباعة
          </Link>
        }
      />
      <div className="space-y-6">
        <PeriodFilter
          action="/admin/reports"
          period={period}
          today={today}
          departments={departments}
          departmentId={departmentId}
        />
        <ReportSections
          viewer={viewer}
          period={period}
          departmentId={departmentId}
        />
      </div>
    </>
  );
}
