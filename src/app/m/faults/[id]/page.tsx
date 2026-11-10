import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { PageSkeleton } from "@/components/page-skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FaultDetails } from "@/features/maintenance/components/fault-details";
import { faultCode } from "@/features/maintenance/labels";
import { getFault } from "@/features/maintenance/queries";
import { requireUser } from "@/lib/auth/dal";
import { getFactorySettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "بلاغ عطل",
};

export default function MobileFaultPage({
  params,
  searchParams,
}: PageProps<"/m/faults/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <MobileFault params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function MobileFault({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  const [fault, settings] = await Promise.all([
    getFault(id),
    getFactorySettings(),
  ]);
  if (!fault) notFound();

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground" dir="ltr">
          {faultCode(fault.number)}
        </p>
        <h1 className="text-xl font-bold">{fault.machine?.name}</h1>
      </div>
      {query.created ? (
        <Alert role="status">
          <AlertDescription>
            وصل بلاغك إلى مدير الصيانة. يمكنك إرفاق صور للعطل من الأسفل.
          </AlertDescription>
        </Alert>
      ) : null}
      <FaultDetails
        fault={fault}
        timeZone={settings.timeZone}
        canAddPhotos={fault.reported_by === user.id && fault.status === "open"}
        taskHref={(taskId) => `/m/tasks/${taskId}`}
      />
    </div>
  );
}
