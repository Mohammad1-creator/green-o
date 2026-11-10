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
import { FaultDetails } from "@/features/maintenance/components/fault-details";
import {
  AssignRepairForm,
  RejectFaultForm,
} from "@/features/maintenance/components/maintenance-forms";
import { faultCode } from "@/features/maintenance/labels";
import { getFault } from "@/features/maintenance/queries";
import { getAssignmentOptions } from "@/features/tasks/queries";
import { requireManager } from "@/lib/auth/dal";
import { getFactorySettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "بلاغ عطل",
};

export default function FaultPage({
  params,
  searchParams,
}: PageProps<"/admin/maintenance/faults/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Fault params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Fault({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireManager();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  const [fault, settings] = await Promise.all([
    getFault(id),
    getFactorySettings(),
  ]);
  if (!fault) notFound();

  // Only the maintenance manager decides what happens to an open report.
  const decides =
    viewer.role === "maintenance_manager" && fault.status === "open";
  const options = decides ? await getAssignmentOptions(viewer) : null;

  return (
    <>
      <PageHeader
        title={`بلاغ عطل: ${fault.machine?.name ?? ""}`}
        description={<span dir="ltr">{faultCode(fault.number)}</span>}
        actions={
          <Link
            href="/admin/maintenance/faults"
            className={buttonVariants({ variant: "outline" })}
          >
            العودة للبلاغات
          </Link>
        }
      />
      {query.created ? (
        <Alert className="mb-6" role="status">
          <AlertDescription>أُرسل البلاغ إلى مدير الصيانة.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <FaultDetails
          fault={fault}
          timeZone={settings.timeZone}
          canAddPhotos={
            fault.reported_by === viewer.id && fault.status === "open"
          }
          taskHref={(taskId) => `/admin/tasks/${taskId}`}
        />

        {decides && options && viewer.departmentId ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>إسناد الإصلاح</CardTitle>
              </CardHeader>
              <CardContent>
                <AssignRepairForm
                  faultId={fault.id}
                  departmentId={viewer.departmentId}
                  defaultTitle={`إصلاح: ${fault.machine?.name ?? ""}`}
                  people={options.people.map((p) => ({
                    id: p.id,
                    name: p.full_name,
                    department_id: p.department_id,
                  }))}
                  teams={options.teams.map((t) => ({
                    id: t.id,
                    name: t.name,
                    department_id: t.department_id,
                  }))}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>أو رفض البلاغ</CardTitle>
              </CardHeader>
              <CardContent>
                <RejectFaultForm faultId={fault.id} />
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </>
  );
}
