import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PmPlanActiveForm,
  PmPlanForm,
} from "@/features/maintenance/components/pm-forms";
import { assigneeLabel } from "@/features/maintenance/components/pm-plan-list";
import { intervalLabel } from "@/features/maintenance/labels";
import { getPmPlan, listPmPlanTasks } from "@/features/maintenance/pm-queries";
import { TaskStatusBadge } from "@/features/tasks/components/task-status-badge";
import { taskCode } from "@/features/tasks/labels";
import { getAssignmentOptions } from "@/features/tasks/queries";
import { requireRole } from "@/lib/auth/dal";
import { formatCalendarDate } from "@/lib/format";
import { getFactorySettings } from "@/lib/settings";
import { addDays, zonedToday } from "@/lib/zoned-time";
import { isTopRole, MAINTENANCE_ROLES } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "خطة صيانة وقائية",
};

export default function PmPlanPage({
  params,
  searchParams,
}: PageProps<"/admin/maintenance/preventive/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PmPlan params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function PmPlan({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireRole(MAINTENANCE_ROLES);
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  const [plan, tasks, settings, options] = await Promise.all([
    getPmPlan(id),
    listPmPlanTasks(id),
    getFactorySettings(),
    getAssignmentOptions(viewer),
  ]);
  if (!plan) notFound();

  const createdOn = addDays(plan.next_due_date, -plan.lead_days);
  const today = zonedToday(settings.timeZone);

  return (
    <>
      <PageHeader
        title={plan.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>
              {plan.machine?.name} ·{" "}
              {intervalLabel(plan.interval_unit, plan.interval_count)} ·{" "}
              {assigneeLabel(plan)}
            </span>
            {plan.is_active ? null : <Badge variant="outline">موقوفة</Badge>}
          </span>
        }
        actions={
          <Link
            href="/admin/maintenance/preventive"
            className={buttonVariants({ variant: "outline" })}
          >
            العودة للخطط
          </Link>
        }
      />
      {query.created ? (
        <Alert className="mb-6" role="status">
          <AlertDescription>
            أُضيفت الخطة. تُنشأ أول مهمة في {formatCalendarDate(createdOn)}.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>الموعد القادم</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {plan.is_active ? (
                <>
                  <p className="text-lg font-semibold">
                    {formatCalendarDate(plan.next_due_date)}
                  </p>
                  <p className="text-muted-foreground">
                    {createdOn <= today
                      ? "تُنشأ مهمته خلال ساعة."
                      : `تُنشأ مهمته في ${formatCalendarDate(createdOn)}.`}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">
                  الخطة موقوفة، فلا مواعيد قادمة.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>المهام المنشأة</CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  لم تُنشأ مهام لهذه الخطة بعد.
                </p>
              ) : (
                <ul className="divide-y" aria-label="المهام المنشأة">
                  {tasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3"
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/tasks/${task.id}`}
                          className="font-medium hover:underline"
                          dir="ltr"
                        >
                          {taskCode(task.number)}
                        </Link>
                        <TaskStatusBadge status={task.status} />
                      </span>
                      <span className="text-sm text-muted-foreground">
                        موعدها{" "}
                        {task.pm_due_date
                          ? formatCalendarDate(task.pm_due_date)
                          : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>تعديل الخطة</CardTitle>
            </CardHeader>
            <CardContent>
              <PmPlanForm
                defaults={{
                  id: plan.id,
                  machineName: plan.machine
                    ? `${plan.machine.code} · ${plan.machine.name}`
                    : "—",
                  title: plan.title,
                  instructions: plan.instructions,
                  intervalUnit: plan.interval_unit,
                  intervalCount: plan.interval_count,
                  startDate: plan.start_date,
                  leadDays: plan.lead_days,
                  departmentId: plan.department_id,
                  assigneeUserId: plan.assignee_user_id,
                  assigneeTeamId: plan.assignee_team_id,
                }}
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
          <Card>
            <CardHeader>
              <CardTitle>حالة الخطة</CardTitle>
            </CardHeader>
            <CardContent>
              <PmPlanActiveForm planId={plan.id} isActive={plan.is_active} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
