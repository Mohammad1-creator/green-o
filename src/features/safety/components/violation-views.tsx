import Link from "next/link";

import { formatDateTime, formatNumber } from "@/lib/format";

import { deductsPoints, violationCode } from "../labels";
import type { ViolationDetail, ViolationListItem } from "../queries";

import { SeverityBadge, ViolationStatusBadge } from "./badges";

/** The facts of one violation and what has happened to it. */
export function ViolationDetails({
  violation,
  timeZone,
}: {
  violation: ViolationDetail;
  timeZone: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ViolationStatusBadge status={violation.status} />
        <SeverityBadge severity={violation.severity} />
        <span className="text-sm text-muted-foreground">
          {deductsPoints(violation.status)
            ? `تخصم ${formatNumber(violation.points)} نقطة`
            : "لا تخصم نقاطاً"}
        </span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted-foreground">الموظف</dt>
        <dd>
          {violation.employee?.full_name}
          {violation.department ? ` · ${violation.department.name}` : null}
        </dd>
        <dt className="text-muted-foreground">المخالفة</dt>
        <dd className="font-medium">{violation.type?.name}</dd>
        <dt className="text-muted-foreground">الوقت</dt>
        <dd>{formatDateTime(violation.occurred_at, timeZone)}</dd>
        {violation.location ? (
          <>
            <dt className="text-muted-foreground">المكان</dt>
            <dd>{violation.location}</dd>
          </>
        ) : null}
        <dt className="text-muted-foreground">سجّلها</dt>
        <dd>
          {violation.recorder?.full_name} ·{" "}
          {formatDateTime(violation.created_at, timeZone)}
        </dd>
      </dl>
      <p className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-line">
        {violation.description}
      </p>
      {violation.objection ? (
        <div className="space-y-1 text-sm">
          <p className="font-semibold">اعتراض الموظف</p>
          <p className="whitespace-pre-line">{violation.objection}</p>
          {violation.responded_at ? (
            <p className="text-xs text-muted-foreground">
              {formatDateTime(violation.responded_at, timeZone)}
            </p>
          ) : null}
        </div>
      ) : violation.status === "accepted" && violation.responded_at ? (
        <p className="text-sm text-muted-foreground">
          قبلها الموظف {formatDateTime(violation.responded_at, timeZone)}
        </p>
      ) : null}
      {violation.decision_note ? (
        <div className="space-y-1 text-sm">
          <p className="font-semibold">
            {violation.status === "cancelled"
              ? "سبب الإلغاء"
              : "قرار مدير السلامة"}
          </p>
          <p className="whitespace-pre-line">{violation.decision_note}</p>
          <p className="text-xs text-muted-foreground">
            {violation.decider?.full_name}
            {violation.decided_at
              ? ` · ${formatDateTime(violation.decided_at, timeZone)}`
              : null}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Cards for the phone, each linking to the violation. */
export function ViolationCards({
  violations,
  hrefBase,
  timeZone,
  showEmployee = false,
}: {
  violations: ViolationListItem[];
  hrefBase: string;
  timeZone: string;
  showEmployee?: boolean;
}) {
  return (
    <ul className="space-y-3">
      {violations.map((violation) => (
        <li key={violation.id}>
          <Link
            href={`${hrefBase}/${violation.id}`}
            className="block rounded-xl border p-4 hover:bg-muted/50"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{violation.type?.name}</p>
              <span className="text-xs text-muted-foreground" dir="ltr">
                {violationCode(violation.number)}
              </span>
            </div>
            {showEmployee ? (
              <p className="mt-1 text-sm">{violation.employee?.full_name}</p>
            ) : null}
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {violation.description}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <ViolationStatusBadge status={violation.status} />
              {formatDateTime(violation.occurred_at, timeZone)}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
