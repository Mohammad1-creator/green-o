import { Badge } from "@/components/ui/badge";

import { TASK_STATUS_LABELS, type TaskStatus } from "../labels";

const VARIANTS: Record<
  TaskStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  new: "default",
  received: "secondary",
  in_progress: "secondary",
  pending_approval: "outline",
  completed: "secondary",
  needs_follow_up: "destructive",
  cancelled: "outline",
};

export function TaskStatusBadge({
  status,
  overdue = false,
}: {
  status: TaskStatus;
  overdue?: boolean | null;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge variant={VARIANTS[status]}>{TASK_STATUS_LABELS[status]}</Badge>
      {overdue ? (
        <Badge variant="destructive" data-testid="overdue-badge">
          متأخرة
        </Badge>
      ) : null}
    </span>
  );
}
