import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { FaultReportForm } from "@/features/maintenance/components/maintenance-forms";
import { listMachines } from "@/features/maintenance/queries";
import { requireManager } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "إبلاغ عن عطل",
};

export default function NewFaultPage() {
  return (
    <>
      <PageHeader title="إبلاغ عن عطل" />
      <Suspense fallback={<PageSkeleton rows={3} />}>
        <NewFault />
      </Suspense>
    </>
  );
}

async function NewFault() {
  await requireManager();
  const machines = await listMachines({ activeOnly: true });
  return (
    <Card className="max-w-xl">
      <CardContent>
        <FaultReportForm machines={machines} origin="admin" />
      </CardContent>
    </Card>
  );
}
