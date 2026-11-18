import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SeverityBadge,
  ViolationStatusBadge,
} from "@/features/safety/components/badges";
import {
  VIOLATION_STATUS_LABELS,
  VIOLATION_STATUSES,
  violationCode,
} from "@/features/safety/labels";
import { listViolations } from "@/features/safety/queries";
import { requireManager } from "@/lib/auth/dal";
import { canRecordViolations } from "@/lib/auth/roles";
import { formatDateTime, formatNumber } from "@/lib/format";
import { getFactorySettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "مخالفات السلامة",
};

export default function ViolationsPage({
  searchParams,
}: PageProps<"/admin/safety/violations">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Violations searchParams={searchParams} />
    </Suspense>
  );
}

async function Violations({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireManager();
  const query = await searchParams;
  const status = VIOLATION_STATUSES.find((value) => value === query.status);
  const [violations, settings] = await Promise.all([
    listViolations(status ?? null),
    getFactorySettings(),
  ]);

  const filters = [
    { label: "الكل", href: "/admin/safety/violations", active: !status },
    ...VIOLATION_STATUSES.map((value) => ({
      label: VIOLATION_STATUS_LABELS[value],
      href: `/admin/safety/violations?status=${value}`,
      active: status === value,
    })),
  ];

  return (
    <>
      <PageHeader
        title="مخالفات السلامة"
        description="المخالفات التي تسمح صلاحياتك برؤيتها. الموظف يقبل المخالفة أو يعترض، ومدير السلامة يبت في الاعتراض."
        actions={
          canRecordViolations(viewer.role) ? (
            <Link
              href="/admin/safety/violations/new"
              className={buttonVariants()}
            >
              <PlusIcon />
              تسجيل مخالفة
            </Link>
          ) : null
        }
      />
      <nav aria-label="تصفية حسب الحالة" className="mb-4 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Link
            key={filter.href}
            href={filter.href}
            aria-current={filter.active ? "page" : undefined}
            className={buttonVariants({
              variant: filter.active ? "default" : "outline",
              size: "sm",
            })}
          >
            {filter.label}
          </Link>
        ))}
      </nav>
      {violations.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد مخالفات.</p>
      ) : (
        <Table aria-label="المخالفات">
          <TableHeader>
            <TableRow>
              <TableHead>الرقم</TableHead>
              <TableHead>الموظف</TableHead>
              <TableHead>المخالفة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="text-end">الخصم</TableHead>
              <TableHead>الوقت</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {violations.map((violation) => (
              <TableRow key={violation.id}>
                <TableCell>
                  <Link
                    href={`/admin/safety/violations/${violation.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                    dir="ltr"
                  >
                    {violationCode(violation.number)}
                  </Link>
                </TableCell>
                <TableCell>
                  {violation.employee?.full_name}
                  {violation.department ? (
                    <span className="text-muted-foreground">
                      {" "}
                      · {violation.department.name}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    {violation.type?.name}
                    <SeverityBadge severity={violation.severity} />
                  </div>
                </TableCell>
                <TableCell>
                  <ViolationStatusBadge status={violation.status} />
                </TableCell>
                <TableCell className="text-end tabular-nums">
                  {violation.status === "cancelled"
                    ? "—"
                    : formatNumber(violation.points)}
                </TableCell>
                <TableCell>
                  {formatDateTime(violation.occurred_at, settings.timeZone)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
