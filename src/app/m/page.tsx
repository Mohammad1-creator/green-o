import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/page-skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
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
  const [tasks, approvals, settings] = await Promise.all([
    listMyTasks(user.id, [
      "new",
      "received",
      "in_progress",
      "needs_follow_up",
      "pending_approval",
    ]),
    isManagerRole(user.role) ? listPendingApprovals(user) : Promise.resolve([]),
    getFactorySettings(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">مرحباً {user.fullName}</h1>

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
