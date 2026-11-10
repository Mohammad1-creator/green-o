import { formatDateTime } from "@/lib/format";

import {
  TASK_EVENT_LABELS,
  TASK_STATUS_LABELS,
  type TaskStatus,
} from "../labels";

type TaskEvent = {
  id: number;
  event: string;
  from_status: TaskStatus | null;
  to_status: TaskStatus | null;
  note: string | null;
  created_at: string;
  actor: { full_name: string } | null;
};

function describe(event: TaskEvent): string {
  if (event.event === "status" && event.to_status) {
    return event.from_status
      ? `من «${TASK_STATUS_LABELS[event.from_status]}» إلى «${TASK_STATUS_LABELS[event.to_status]}»`
      : `«${TASK_STATUS_LABELS[event.to_status]}»`;
  }
  return TASK_EVENT_LABELS[event.event] ?? event.event;
}

export function TaskTimeline({
  events,
  timeZone,
}: {
  events: TaskEvent[];
  timeZone: string;
}) {
  return (
    <ol className="space-y-4" aria-label="سجل المهمة">
      {events.map((event) => (
        <li key={event.id} className="relative border-s-2 ps-4">
          <p className="text-sm font-medium">{describe(event)}</p>
          {event.note ? (
            <p className="mt-1 text-sm whitespace-pre-line">«{event.note}»</p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {event.actor?.full_name ?? "النظام"} ·{" "}
            {formatDateTime(event.created_at, timeZone)}
          </p>
        </li>
      ))}
    </ol>
  );
}
