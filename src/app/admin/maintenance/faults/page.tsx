import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FaultStatusBadge } from "@/features/maintenance/components/badges";
import {
  FAULT_VIEWS,
  faultCode,
  isFaultView,
} from "@/features/maintenance/labels";
import { listFaults } from "@/features/maintenance/queries";
import { requireManager } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/format";
import { getFactorySettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "بلاغات الأعطال",
};

export default function FaultsPage({
  searchParams,
}: PageProps<"/admin/maintenance/faults">) {
  return (
    <>
      <PageHeader
        title="بلاغات الأعطال"
        actions={
          <Link
            href="/admin/maintenance/faults/new"
            className={buttonVariants()}
          >
            <PlusIcon />
            إبلاغ عن عطل
          </Link>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <FaultList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function FaultList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireManager();
  const params = await searchParams;
  const view = isFaultView(params.view) ? params.view : "open";
  const [faults, settings] = await Promise.all([
    listFaults(FAULT_VIEWS[view].statuses),
    getFactorySettings(),
  ]);

  return (
    <div className="space-y-4">
      <nav aria-label="تصفية البلاغات" className="flex flex-wrap gap-2">
        {(Object.keys(FAULT_VIEWS) as (keyof typeof FAULT_VIEWS)[]).map(
          (key) => (
            <Link
              key={key}
              href={`/admin/maintenance/faults?view=${key}`}
              aria-current={view === key ? "page" : undefined}
              className={buttonVariants({
                variant: view === key ? "default" : "outline",
                size: "sm",
              })}
            >
              {FAULT_VIEWS[key].label}
            </Link>
          ),
        )}
      </nav>
      {faults.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>لا توجد بلاغات هنا</EmptyTitle>
            <EmptyDescription>جرّب تصفية أخرى.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>البلاغ</TableHead>
              <TableHead>الآلة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>المبلِّغ</TableHead>
              <TableHead>الوقت</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {faults.map((fault) => (
              <TableRow key={fault.id}>
                <TableCell>
                  <Link
                    href={`/admin/maintenance/faults/${fault.id}`}
                    className="font-medium hover:underline"
                  >
                    {fault.description.slice(0, 60)}
                  </Link>
                  <div className="text-xs text-muted-foreground" dir="ltr">
                    {faultCode(fault.number)}
                  </div>
                </TableCell>
                <TableCell>
                  {fault.machine?.name}
                  <div className="text-xs text-muted-foreground" dir="ltr">
                    {fault.machine?.code}
                  </div>
                </TableCell>
                <TableCell>
                  <FaultStatusBadge
                    status={fault.status}
                    stopped={fault.machine_stopped}
                  />
                </TableCell>
                <TableCell>
                  {fault.reporter?.full_name}
                  {fault.department ? (
                    <div className="text-xs text-muted-foreground">
                      {fault.department.name}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell>
                  {formatDateTime(fault.created_at, settings.timeZone)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
