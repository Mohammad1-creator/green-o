import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FaultStatusBadge,
  MachineStatusBadge,
} from "@/features/maintenance/components/badges";
import { MachineForm } from "@/features/maintenance/components/maintenance-forms";
import { faultCode } from "@/features/maintenance/labels";
import { getMachine, listMachineFaults } from "@/features/maintenance/queries";
import { listDepartments } from "@/features/users/queries";
import { requireRole } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/format";
import { getFactorySettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "بيانات الآلة",
};

export default function MachinePage({
  params,
  searchParams,
}: PageProps<"/admin/maintenance/machines/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MachineDetails params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function MachineDetails({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["general_manager", "maintenance_manager"]);
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  const [machine, faults, departments, settings] = await Promise.all([
    getMachine(id),
    listMachineFaults(id),
    listDepartments({ activeOnly: true }),
    getFactorySettings(),
  ]);
  if (!machine) notFound();

  return (
    <>
      <PageHeader
        title={machine.name}
        description={
          <span className="flex items-center gap-2">
            <span dir="ltr">{machine.code}</span>
            <MachineStatusBadge status={machine.status} />
          </span>
        }
        actions={
          <Link
            href="/admin/maintenance/machines"
            className={buttonVariants({ variant: "outline" })}
          >
            العودة للآلات
          </Link>
        }
      />
      {query.created ? (
        <Alert className="mb-6" role="status">
          <AlertDescription>أُضيفت الآلة.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>سجل الأعطال والإصلاحات</CardTitle>
          </CardHeader>
          <CardContent>
            {faults.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد أعطال مسجلة.
              </p>
            ) : (
              <ul className="divide-y" aria-label="سجل الأعطال">
                {faults.map((fault) => (
                  <li key={fault.id} className="space-y-1 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/maintenance/faults/${fault.id}`}
                        className="font-medium hover:underline"
                        dir="ltr"
                      >
                        {faultCode(fault.number)}
                      </Link>
                      <FaultStatusBadge
                        status={fault.status}
                        stopped={fault.machine_stopped}
                      />
                    </div>
                    <p className="text-sm">{fault.description}</p>
                    {fault.resolution_notes ? (
                      <p className="text-sm text-muted-foreground">
                        الإصلاح: {fault.resolution_notes}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {fault.reporter?.full_name} ·{" "}
                      {formatDateTime(fault.created_at, settings.timeZone)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>بيانات الآلة</CardTitle>
          </CardHeader>
          <CardContent>
            <MachineForm
              departments={departments}
              defaults={{
                id: machine.id,
                code: machine.code,
                name: machine.name,
                departmentId: machine.department_id,
                status: machine.status,
                manufacturer: machine.manufacturer,
                model: machine.model,
                serialNo: machine.serial_no,
                installedOn: machine.installed_on,
                notes: machine.notes,
              }}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
