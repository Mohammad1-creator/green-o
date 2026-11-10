import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ManagerTaskActions } from "@/features/tasks/components/task-actions";
import {
  EditTaskForm,
  ReassignTaskForm,
} from "@/features/tasks/components/task-forms";
import { TaskStatusBadge } from "@/features/tasks/components/task-status-badge";
import { TaskTimeline } from "@/features/tasks/components/task-timeline";
import {
  TASK_KIND_LABELS,
  isFinalStatus,
  isOpenStatus,
  taskCode,
} from "@/features/tasks/labels";
import { getAssignmentOptions, getTaskDetail } from "@/features/tasks/queries";
import { requireManager } from "@/lib/auth/dal";
import { managesDepartment } from "@/lib/auth/scope";
import { formatDateTime } from "@/lib/format";
import { getFactorySettings } from "@/lib/settings";
import { dateToZonedLocal } from "@/lib/zoned-time";

export const metadata: Metadata = {
  title: "تفاصيل المهمة",
};

export default function TaskPage({
  params,
  searchParams,
}: PageProps<"/admin/tasks/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TaskDetails params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function TaskDetails({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireManager();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  const [task, settings] = await Promise.all([
    getTaskDetail(id),
    getFactorySettings(),
  ]);
  if (!task) notFound();

  const tz = settings.timeZone;
  const canManage = managesDepartment(viewer, task.department_id);
  const options =
    canManage && isOpenStatus(task.status)
      ? await getAssignmentOptions(viewer)
      : null;

  return (
    <>
      <PageHeader
        title={task.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span dir="ltr">{taskCode(task.number)}</span>
            <span>· {TASK_KIND_LABELS[task.kind]}</span>
            <span>· {task.department?.name}</span>
          </span>
        }
        actions={
          <Link
            href="/admin/tasks"
            className={buttonVariants({ variant: "outline" })}
          >
            العودة للمهام
          </Link>
        }
      />

      {query.created ? (
        <Alert className="mb-6" role="status">
          <AlertDescription>
            أُنشئت المهمة وأُرسل إشعار للمسند إليهم.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-3">
                <TaskStatusBadge
                  status={task.status}
                  overdue={task.is_overdue}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                <dt className="text-muted-foreground">الاستحقاق</dt>
                <dd>
                  {task.due_at ? formatDateTime(task.due_at, tz) : "بلا موعد"}
                </dd>
                <dt className="text-muted-foreground">أنشأها</dt>
                <dd>
                  {task.creator?.full_name ?? "النظام"} ·{" "}
                  {formatDateTime(task.created_at, tz)}
                </dd>
                {task.team ? (
                  <>
                    <dt className="text-muted-foreground">الفريق</dt>
                    <dd>{task.team.name}</dd>
                  </>
                ) : null}
                {task.completed_at ? (
                  <>
                    <dt className="text-muted-foreground">اعتمدها</dt>
                    <dd>
                      {task.approver?.full_name} ·{" "}
                      {formatDateTime(task.completed_at, tz)}
                    </dd>
                  </>
                ) : null}
                {task.cancel_reason ? (
                  <>
                    <dt className="text-muted-foreground">سبب الإلغاء</dt>
                    <dd>{task.cancel_reason}</dd>
                  </>
                ) : null}
              </dl>
              {task.description ? (
                <p className="text-sm whitespace-pre-line">
                  {task.description}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>المسند إليهم</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y" aria-label="المسند إليهم">
                {task.assignees.map((assignee) => (
                  <li
                    key={assignee.user_id}
                    className="flex flex-wrap justify-between gap-2 py-2 text-sm"
                  >
                    <span className="font-medium">
                      {assignee.person?.full_name}
                    </span>
                    <span className="text-muted-foreground">
                      {assignee.seen_at
                        ? `شاهدها ${formatDateTime(assignee.seen_at, tz)}`
                        : "لم يشاهدها بعد"}
                      {" · "}
                      {assignee.acknowledged_at
                        ? `استلمها ${formatDateTime(assignee.acknowledged_at, tz)}`
                        : "لم يستلمها"}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>السجل</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskTimeline events={task.events} timeZone={tz} />
            </CardContent>
          </Card>
        </div>

        {canManage && !isFinalStatus(task.status) ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>إجراءات المدير</CardTitle>
              </CardHeader>
              <CardContent>
                <ManagerTaskActions taskId={task.id} status={task.status} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>تعديل المهمة</CardTitle>
              </CardHeader>
              <CardContent>
                <EditTaskForm
                  taskId={task.id}
                  defaults={{
                    title: task.title,
                    description: task.description,
                    dueLocal: task.due_at
                      ? dateToZonedLocal(task.due_at, tz)
                      : "",
                  }}
                />
              </CardContent>
            </Card>
            {options ? (
              <Card>
                <CardHeader>
                  <CardTitle>تغيير الإسناد</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReassignTaskForm
                    taskId={task.id}
                    departmentId={task.department_id}
                    defaultMode={task.assigned_team_id ? "team" : "person"}
                    people={options.people.map((p) => ({
                      id: p.id,
                      name: p.full_name,
                      department_id: p.department_id,
                    }))}
                    teams={options.teams.map((t) => ({
                      id: t.id,
                      name: t.name,
                      department_id: t.department_id,
                    }))}
                  />
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
