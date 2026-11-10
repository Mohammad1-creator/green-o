import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCalendarDate } from "@/lib/format";
import { addDays } from "@/lib/zoned-time";

import { type IntervalUnit, intervalLabel } from "../labels";

export type PmPlanRow = {
  id: string;
  title: string;
  interval_unit: IntervalUnit;
  interval_count: number;
  next_due_date: string;
  lead_days: number;
  machine: { code: string; name: string } | null;
  assignee: { full_name: string } | null;
  team: { name: string } | null;
};

export function assigneeLabel(plan: Pick<PmPlanRow, "assignee" | "team">) {
  if (plan.assignee) return plan.assignee.full_name;
  if (plan.team) return `فريق ${plan.team.name}`;
  return "—";
}

/** Plans with their next date; `showMachine` is off on a machine's own page. */
export function PmPlanTable({
  plans,
  label,
  showMachine = true,
}: {
  plans: PmPlanRow[];
  label: string;
  showMachine?: boolean;
}) {
  return (
    <Table aria-label={label}>
      <TableHeader>
        <TableRow>
          <TableHead>الموعد القادم</TableHead>
          <TableHead>الخطة</TableHead>
          {showMachine ? <TableHead>الآلة</TableHead> : null}
          <TableHead>التكرار</TableHead>
          <TableHead>المسند إليه</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {plans.map((plan) => (
          <TableRow key={plan.id}>
            <TableCell>
              {formatCalendarDate(plan.next_due_date)}
              {plan.lead_days > 0 ? (
                <div className="text-xs text-muted-foreground">
                  تُنشأ المهمة في{" "}
                  {formatCalendarDate(
                    addDays(plan.next_due_date, -plan.lead_days),
                  )}
                </div>
              ) : null}
            </TableCell>
            <TableCell>
              <Link
                href={`/admin/maintenance/preventive/${plan.id}`}
                className="font-medium hover:underline"
              >
                {plan.title}
              </Link>
            </TableCell>
            {showMachine ? (
              <TableCell>
                {plan.machine ? (
                  <>
                    <span dir="ltr">{plan.machine.code}</span> ·{" "}
                    {plan.machine.name}
                  </>
                ) : (
                  "—"
                )}
              </TableCell>
            ) : null}
            <TableCell>
              {intervalLabel(plan.interval_unit, plan.interval_count)}
            </TableCell>
            <TableCell>{assigneeLabel(plan)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
