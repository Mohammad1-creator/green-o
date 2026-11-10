import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { navItemsFor } from "@/components/admin/nav-items";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ratio } from "@/features/reports/definitions";
import { KpiRow } from "@/features/reports/components/report-parts";
import {
  getMaintenanceSummary,
  getProductionSummary,
  getTaskSummary,
} from "@/features/reports/summaries";
import { type CurrentUser, requireManager } from "@/lib/auth/dal";
import { formatNumber, formatPercent } from "@/lib/format";
import { getFactorySettings } from "@/lib/settings";
import { addDays, zonedToday } from "@/lib/zoned-time";

export const metadata: Metadata = {
  title: "الرئيسية",
};

export default function AdminHomePage() {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <AdminHome />
    </Suspense>
  );
}

/** The week at a glance, by role; the reports page has the detail. */
async function WeekAtAGlance({ user }: { user: CurrentUser }) {
  const settings = await getFactorySettings();
  const today = zonedToday(settings.timeZone);
  const period = { from: addDays(today, -6), to: today };
  const [tasks, maintenance, production] = await Promise.all([
    getTaskSummary(period, null),
    user.role === "production_manager"
      ? Promise.resolve(null)
      : getMaintenanceSummary(period),
    user.role === "maintenance_manager"
      ? Promise.resolve(null)
      : getProductionSummary(period),
  ]);
  const onTime = ratio(tasks?.completed_on_time ?? 0, tasks?.completed ?? 0);

  const tiles = [
    {
      label: "مهام متأخرة الآن",
      value: formatNumber(tasks?.overdue ?? 0),
      hint: `بانتظار الاعتماد ${formatNumber(tasks?.pending_approval ?? 0)}`,
    },
    {
      label: "أُنجزت في موعدها",
      value: onTime === null ? "—" : formatPercent(onTime),
      hint: `من ${formatNumber(tasks?.completed ?? 0)} مكتملة هذا الأسبوع`,
    },
  ];
  if (maintenance) {
    tiles.push({
      label: "بلاغات أعطال مفتوحة",
      value: formatNumber(maintenance.summary?.open_now ?? 0),
      hint: `جديدة هذا الأسبوع ${formatNumber(maintenance.summary?.reported ?? 0)}`,
    });
  }
  if (production) {
    tiles.push({
      label: "أوامر إنتاج جارية",
      value: formatNumber(production.orders_running),
      hint: `متأخرة عن التسليم ${formatNumber(production.orders_late)}`,
    });
  }

  return (
    <section aria-labelledby="week-heading" className="mb-8 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="week-heading" className="font-semibold">
          آخر 7 أيام
        </h2>
        <Link
          href="/admin/reports"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          كل التقارير
        </Link>
      </div>
      <KpiRow label="مؤشرات آخر 7 أيام" tiles={tiles} />
    </section>
  );
}

async function AdminHome() {
  const user = await requireManager();
  const shortcuts = navItemsFor(user.role).filter(
    (item) => item.href !== "/admin",
  );

  return (
    <>
      <PageHeader
        title={`مرحباً ${user.fullName}`}
        description="اختر ما تريد العمل عليه."
      />
      <WeekAtAGlance user={user} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shortcuts.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl focus-visible:outline-2"
          >
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle>{item.label}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
