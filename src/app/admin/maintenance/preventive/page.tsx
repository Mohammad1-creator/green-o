import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { StatTile } from "@/components/stat-tile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PmPlanForm,
  RunPmNowForm,
} from "@/features/maintenance/components/pm-forms";
import { PmPlanTable } from "@/features/maintenance/components/pm-plan-list";
import {
  getPmCompliance,
  listPmPlans,
} from "@/features/maintenance/pm-queries";
import { listMachines } from "@/features/maintenance/queries";
import { getAssignmentOptions } from "@/features/tasks/queries";
import { requireRole } from "@/lib/auth/dal";
import { getAppEnv } from "@/lib/env";
import { formatNumber, formatPercent } from "@/lib/format";
import { getFactorySettings } from "@/lib/settings";
import { addDays, zonedToday } from "@/lib/zoned-time";
import { isTopRole, MAINTENANCE_ROLES } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "الصيانة الوقائية",
};

const COMPLIANCE_DAYS = 90;

export default function PreventivePage({
  searchParams,
}: PageProps<"/admin/maintenance/preventive">) {
  return (
    <>
      <PageHeader
        title="الصيانة الوقائية"
        description="خطط دورية تُنشئ مهام الصيانة تلقائياً في مواعيدها، بتوقيت المصنع."
      />
      <Suspense fallback={<PageSkeleton />}>
        <Preventive searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Preventive({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireRole(MAINTENANCE_ROLES);
  const [query, settings] = await Promise.all([
    searchParams,
    getFactorySettings(),
  ]);
  const today = zonedToday(settings.timeZone);
  const [plans, compliance, machines, options] = await Promise.all([
    listPmPlans(),
    getPmCompliance(addDays(today, -COMPLIANCE_DAYS), today),
    listMachines({ activeOnly: true }),
    getAssignmentOptions(viewer),
  ]);

  const rate = compliance.due > 0 ? compliance.on_time / compliance.due : null;
  const active = plans.filter((plan) => plan.is_active);
  const paused = plans.filter((plan) => !plan.is_active);
  const machineParam = z.uuid().safeParse(query.machine);
  const defaultMachineId = machineParam.success ? machineParam.data : undefined;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>الالتزام بالصيانة الوقائية</CardTitle>
          <CardDescription>
            المهام التي حلّ موعدها خلال آخر {formatNumber(COMPLIANCE_DAYS)}{" "}
            يوماً. «في موعدها» تعني أنها سُلّمت قبل نهاية يوم موعدها واعتُمدت.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="نسبة الالتزام"
              value={rate === null ? "—" : formatPercent(rate)}
              hint={
                compliance.due === 0
                  ? "لم يحل موعد أي مهمة بعد"
                  : `من ${formatNumber(compliance.due)} مهمة`
              }
            />
            <StatTile
              label="نُفّذت في موعدها"
              value={formatNumber(compliance.on_time)}
            />
            <StatTile
              label="نُفّذت بعد موعدها"
              value={formatNumber(compliance.late)}
            />
            <StatTile
              label="لم تُنجز بعد"
              value={formatNumber(compliance.missed)}
            />
          </dl>
          {compliance.cancelled > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              أُلغيت {formatNumber(compliance.cancelled)} من المهام، ولم تُحسب
              في النسبة.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>المواعيد القادمة</CardTitle>
        </CardHeader>
        <CardContent>
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              لا توجد خطط فعّالة. أضف خطة من الأسفل.
            </p>
          ) : (
            <PmPlanTable plans={active} label="المواعيد القادمة" />
          )}
        </CardContent>
      </Card>

      {paused.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>الخطط الموقوفة</CardTitle>
          </CardHeader>
          <CardContent>
            <PmPlanTable plans={paused} label="الخطط الموقوفة" />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card id="new-plan">
          <CardHeader>
            <CardTitle>إضافة خطة</CardTitle>
          </CardHeader>
          <CardContent>
            <PmPlanForm
              machines={machines}
              defaultMachineId={defaultMachineId}
              departments={options.departments}
              people={options.people.map((person) => ({
                id: person.id,
                name: person.full_name,
                department_id: person.department_id,
              }))}
              teams={options.teams.map((team) => ({
                id: team.id,
                name: team.name,
                department_id: team.department_id,
              }))}
              fixedDepartmentId={
                isTopRole(viewer.role) ? null : viewer.departmentId
              }
              today={today}
            />
          </CardContent>
        </Card>

        {getAppEnv() === "prod" ? null : (
          <Card className="self-start">
            <CardHeader>
              <CardTitle>تجربة الجدولة</CardTitle>
            </CardHeader>
            <CardContent>
              <RunPmNowForm />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
