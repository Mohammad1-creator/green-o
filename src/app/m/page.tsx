import { ShieldAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/page-skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { countPendingViolations } from "@/features/safety/queries";
import { TaskCard } from "@/features/tasks/components/task-card";
import { listMyTasks, listPendingApprovals } from "@/features/tasks/queries";
import { requireUser } from "@/lib/auth/dal";
import { isManagerRole } from "@/lib/auth/roles";
import { getFactorySettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "مهامي",
};

export default function MobileHomePage() {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <MyWork />
    </Suspense>
  );
}

async function MyWork() {
  const user = await requireUser();
  const [tasks, approvals, settings, pendingViolations] = await Promise.all([
    listMyTasks(user.id, [
      "new",
      "received",
      "in_progress",
      "needs_follow_up",
      "pending_approval",
    ]),
    isManagerRole(user.role) ? listPendingApprovals(user) : Promise.resolve([]),
    getFactorySettings(),
    countPendingViolations(user.id),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">مرحباً {user.fullName}</h1>

      {pendingViolations > 0 ? (
        <Link
          href="/m/violations"
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-medium text-destructive"
        >
          <ShieldAlertIcon className="size-5 shrink-0" aria-hidden />
          {pendingViolations === 1
            ? "سُجّلت عليك مخالفة سلامة بانتظار ردك."
            : `سُجّلت عليك ${pendingViolations} مخالفات سلامة بانتظار ردك.`}
        </Link>
      ) : null}

      {approvals.length > 0 ? (
        <section className="space-y-3" aria-labelledby="approvals-heading">
          <h2 id="approvals-heading" className="font-semibold">
            بانتظار اعتمادي ({approvals.length})
          </h2>
          {approvals.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              href={`/m/tasks/${task.id}`}
              timeZone={settings.timeZone}
            />
          ))}
        </section>
      ) : null}

      <section className="space-y-3" aria-labelledby="my-tasks-heading">
        <h2 id="my-tasks-heading" className="font-semibold">
          مهامي
        </h2>
        {tasks.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>لا توجد مهام مفتوحة</EmptyTitle>
              <EmptyDescription>
                ستظهر هنا المهام المسندة إليك.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              href={`/m/tasks/${task.id}`}
              timeZone={settings.timeZone}
              unseen={!task.mine[0]?.seen_at}
            />
          ))
        )}
      </section>
    </div>
  );
}
