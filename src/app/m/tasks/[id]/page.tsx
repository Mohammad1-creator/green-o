import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { PageSkeleton } from "@/components/page-skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AssigneeTaskActions,
  ManagerTaskActions,
  MarkSeen,
} from "@/features/tasks/components/task-actions";
import { TaskStatusBadge } from "@/features/tasks/components/task-status-badge";
import { TaskTimeline } from "@/features/tasks/components/task-timeline";
import { taskCode } from "@/features/tasks/labels";
import { getTaskDetail } from "@/features/tasks/queries";
import { requireUser } from "@/lib/auth/dal";
import { managesDepartment } from "@/lib/auth/scope";
import { formatDateTime } from "@/lib/format";
import { getFactorySettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "المهمة",
};

export default function MobileTaskPage({ params }: PageProps<"/m/tasks/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <MobileTask params={params} />
    </Suspense>
  );
}

async function MobileTask({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [task, settings] = await Promise.all([
    getTaskDetail(id),
    getFactorySettings(),
  ]);
  if (!task) notFound();
  const tz = settings.timeZone;

  const mine = task.assignees.find((assignee) => assignee.user_id === user.id);
  const canManage = managesDepartment(user, task.department_id);
  const lastReturn =
    task.status === "needs_follow_up"
      ? [...task.events]
          .reverse()
          .find((event) => event.to_status === "needs_follow_up")
      : undefined;

  return (
    <div className="space-y-5">
      {mine ? <MarkSeen taskId={task.id} /> : null}

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground" dir="ltr">
          {taskCode(task.number)}
        </p>
        <h1 className="text-xl font-bold">{task.title}</h1>
        <TaskStatusBadge status={task.status} overdue={task.is_overdue} />
      </div>

      {lastReturn?.note ? (
        <Alert variant="destructive">
          <AlertTitle>أعادها المدير للمتابعة</AlertTitle>
          <AlertDescription>{lastReturn.note}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">الاستحقاق: </span>
            {task.due_at ? formatDateTime(task.due_at, tz) : "بلا موعد"}
          </p>
          <p>
            <span className="text-muted-foreground">من: </span>
            {task.creator?.full_name ?? "النظام"}
          </p>
          {task.description ? (
            <p className="whitespace-pre-line">{task.description}</p>
          ) : null}
        </CardContent>
      </Card>

      {mine ? (
        <Card>
          <CardHeader>
            <CardTitle>ماذا بعد؟</CardTitle>
          </CardHeader>
          <CardContent>
            <AssigneeTaskActions
              taskId={task.id}
              status={task.status}
              acknowledged={Boolean(mine.acknowledged_at)}
            />
          </CardContent>
        </Card>
      ) : null}

      {canManage && task.status === "pending_approval" ? (
        <Card>
          <CardHeader>
            <CardTitle>الاعتماد</CardTitle>
          </CardHeader>
          <CardContent>
            <ManagerTaskActions taskId={task.id} status={task.status} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>السجل</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskTimeline events={task.events} timeZone={tz} />
        </CardContent>
      </Card>
    </div>
  );
}
