import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/page-skeleton";
import { FaultReportForm } from "@/features/maintenance/components/maintenance-forms";
import { listMachines } from "@/features/maintenance/queries";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "إبلاغ عن عطل",
};

export default function MobileNewFaultPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">إبلاغ عن عطل</h1>
      <Suspense fallback={<PageSkeleton rows={3} />}>
        <NewFault />
      </Suspense>
    </div>
  );
}

async function NewFault() {
  await requireUser();
  const machines = await listMachines({ activeOnly: true });
  if (machines.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        لا توجد آلات مسجلة بعد. راجع مدير الصيانة.
      </p>
    );
  }
  return <FaultReportForm machines={machines} origin="m" />;
}
