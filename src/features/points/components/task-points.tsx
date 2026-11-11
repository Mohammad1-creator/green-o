import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatNumber } from "@/lib/format";

import { getTaskPoints } from "../queries";

import { AwardPointsForm, VoidPointsForm } from "./points-forms";

/**
 * Points on a completed task, for its managers: the awards so far and a
 * form to add more. People cannot award themselves.
 */
export async function TaskPoints({
  taskId,
  viewerId,
  assignees,
  timeZone,
}: {
  taskId: string;
  viewerId: string;
  assignees: { id: string; name: string }[];
  timeZone: string;
}) {
  const rows = await getTaskPoints(taskId);
  const people = assignees.filter((person) => person.id !== viewerId);
  const live = rows.filter((row) => !row.voided_at);
  const total = live.reduce((sum, row) => sum + row.points, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>النقاط</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            لم تُمنح نقاط على هذه المهمة بعد.
          </p>
        ) : (
          <>
            <p className="text-sm">
              المجموع:{" "}
              <span className="font-bold tabular-nums">
                {formatNumber(total)}
              </span>{" "}
              نقطة
            </p>
            <ul className="divide-y" aria-label="النقاط الممنوحة">
              {rows.map((row) => (
                <li key={row.id} className="space-y-1 py-2 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span
                      className={
                        row.voided_at
                          ? "text-muted-foreground line-through"
                          : "font-medium"
                      }
                    >
                      {row.person?.full_name}:{" "}
                      <span className="tabular-nums">
                        {formatNumber(row.points)}
                      </span>{" "}
                      نقطة
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {row.awarder?.full_name} ·{" "}
                      {formatDateTime(row.created_at, timeZone)}
                    </span>
                  </div>
                  {row.note ? (
                    <p className="text-muted-foreground">{row.note}</p>
                  ) : null}
                  {row.voided_at ? (
                    <p className="text-xs text-destructive">
                      ملغاة: {row.void_reason} ({row.voider?.full_name})
                    </p>
                  ) : (
                    <VoidPointsForm taskId={taskId} pointsId={row.id} />
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
        {people.length > 0 ? (
          <AwardPointsForm taskId={taskId} people={people} />
        ) : null}
      </CardContent>
    </Card>
  );
}
