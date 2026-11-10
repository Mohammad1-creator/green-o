import Link from "next/link";

import { formatDateTime } from "@/lib/format";

import { taskCode, type TaskStatus } from "../labels";

import { TaskStatusBadge } from "./task-status-badge";

export type TaskCardData = {
  id: string;
  number: number;
  title: string;
  status: TaskStatus;
  due_at: string | null;
  is_overdue: boolean | null;
  department?: { name: string } | null;
};

/** A task in a phone-sized list. */
export function TaskCard({
  task,
  href,
  timeZone,
  unseen = false,
}: {
  task: TaskCardData;
  href: string;
  timeZone: string;
  unseen?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-xl border p-4 transition-colors hover:bg-muted/50 ${
        task.is_overdue ? "border-destructive/50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={unseen ? "font-bold" : "font-semibold"}>
          {task.title}
          {unseen ? <span className="sr-only"> (جديدة لم تشاهدها)</span> : null}
        </p>
        <span className="shrink-0 text-xs text-muted-foreground" dir="ltr">
          {taskCode(task.number)}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <TaskStatusBadge status={task.status} overdue={task.is_overdue} />
        {task.due_at ? (
          <span className="text-muted-foreground">
            الاستحقاق: {formatDateTime(task.due_at, timeZone)}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
