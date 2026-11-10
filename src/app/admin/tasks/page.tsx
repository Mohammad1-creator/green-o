import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TaskStatusBadge } from "@/features/tasks/components/task-status-badge";
import { TASK_FILTERS, isTaskFilter, taskCode } from "@/features/tasks/labels";
import { listManagedTasks } from "@/features/tasks/queries";
import { requireManager } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/format";
import { getFactorySettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "المهام",
};

const VIEWS = [
  ["open", TASK_FILTERS.open.label],
  ["overdue", "المتأخرة"],
  ["pending_approval", TASK_FILTERS.pending_approval.label],
  ["completed", TASK_FILTERS.completed.label],
  ["cancelled", TASK_FILTERS.cancelled.label],
  ["all", TASK_FILTERS.all.label],
] as const;

export default function TasksPage({ searchParams }: PageProps<"/admin/tasks">) {
  return (
    <>
      <PageHeader
        title="المهام"
        actions={
          <Link href="/admin/tasks/new" className={buttonVariants()}>
            <PlusIcon />
            مهمة جديدة
          </Link>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <TaskList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function TaskList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireManager();
  const params = await searchParams;
  const view = typeof params.view === "string" ? params.view : "open";
  const overdueOnly = view === "overdue";
  const filter = isTaskFilter(view) ? view : "open";

  const [tasks, settings] = await Promise.all([
    listManagedTasks({ statuses: TASK_FILTERS[filter].statuses, overdueOnly }),
    getFactorySettings(),
  ]);

  return (
    <div className="space-y-4">
      <nav aria-label="تصفية المهام" className="flex flex-wrap gap-2">
        {VIEWS.map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/tasks?view=${key}`}
            aria-current={view === key ? "page" : undefined}
            className={buttonVariants({
              variant: view === key ? "default" : "outline",
              size: "sm",
            })}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tasks.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>لا توجد مهام هنا</EmptyTitle>
            <EmptyDescription>
              جرّب تصفية أخرى، أو أنشئ مهمة جديدة.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المهمة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>المسند إليهم</TableHead>
              <TableHead>الاستحقاق</TableHead>
              <TableHead>القسم</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>
                  <Link
                    href={`/admin/tasks/${task.id}`}
                    className="font-medium hover:underline"
                  >
                    {task.title}
                  </Link>
                  <div className="text-xs text-muted-foreground" dir="ltr">
                    {taskCode(task.number)}
                  </div>
                </TableCell>
                <TableCell>
                  <TaskStatusBadge
                    status={task.status}
                    overdue={task.is_overdue}
                  />
                </TableCell>
                <TableCell className="max-w-56 truncate">
                  {task.assignees
                    .map((a) => a.person?.full_name)
                    .filter(Boolean)
                    .join("، ")}
                </TableCell>
                <TableCell>
                  {task.due_at
                    ? formatDateTime(task.due_at, settings.timeZone)
                    : "—"}
                </TableCell>
                <TableCell>{task.department?.name ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
