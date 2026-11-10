import type { TaskStatus } from "@/features/tasks/labels";

export type PmTaskOutcome = {
  status: TaskStatus;
  due_at: string | null;
  submitted_at: string | null;
};

export type PmCompliance = {
  /** Occurrences counted: everything due in the period, except cancelled. */
  due: number;
  onTime: number;
  late: number;
  /** Past due and still not approved. */
  missed: number;
  cancelled: number;
  /** onTime / due, or null when nothing was due. */
  rate: number | null;
};

/**
 * Preventive maintenance compliance over tasks whose due date has passed.
 * On time = approved, and handed in before the end of its due day.
 * Cancelled tasks are left out of the rate (cancelling needs a reason and is
 * audited) but are counted, so they stay visible.
 */
export function pmCompliance(tasks: readonly PmTaskOutcome[]): PmCompliance {
  let onTime = 0;
  let late = 0;
  let missed = 0;
  let cancelled = 0;
  for (const task of tasks) {
    if (task.status === "cancelled") {
      cancelled += 1;
    } else if (task.status !== "completed") {
      missed += 1;
    } else if (
      task.due_at &&
      task.submitted_at &&
      new Date(task.submitted_at).getTime() > new Date(task.due_at).getTime()
    ) {
      late += 1;
    } else {
      onTime += 1;
    }
  }
  const due = onTime + late + missed;
  return {
    due,
    onTime,
    late,
    missed,
    cancelled,
    rate: due === 0 ? null : onTime / due,
  };
}
