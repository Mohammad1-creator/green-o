import { TriangleAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/page-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { FaultStatusBadge } from "@/features/maintenance/components/badges";
import { faultCode } from "@/features/maintenance/labels";
import { listMyFaults } from "@/features/maintenance/queries";
import { requireUser } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/format";
import { getFactorySettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "الأعطال",
};

export default function MobileFaultsPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">الأعطال</h1>
      <Link
        href="/m/faults/new"
        className={buttonVariants({ size: "lg", className: "w-full" })}
      >
        <TriangleAlertIcon />
        إبلاغ عن عطل
      </Link>
      <Suspense fallback={<PageSkeleton rows={3} />}>
        <MyFaults />
      </Suspense>
    </div>
  );
}

async function MyFaults() {
  const user = await requireUser();
  const [faults, settings] = await Promise.all([
    listMyFaults(user.id),
    getFactorySettings(),
  ]);

  if (faults.length === 0) {
    return <p className="text-sm text-muted-foreground">لم ترسل بلاغات بعد.</p>;
  }
  return (
    <section className="space-y-3" aria-labelledby="my-faults">
      <h2 id="my-faults" className="font-semibold">
        بلاغاتي
      </h2>
      {faults.map((fault) => (
        <Link
          key={fault.id}
          href={`/m/faults/${fault.id}`}
          className="block rounded-xl border p-4 hover:bg-muted/50"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold">{fault.machine?.name}</p>
            <span className="text-xs text-muted-foreground" dir="ltr">
              {faultCode(fault.number)}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm">{fault.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <FaultStatusBadge
              status={fault.status}
              stopped={fault.machine_stopped}
            />
            {formatDateTime(fault.created_at, settings.timeZone)}
          </div>
        </Link>
      ))}
    </section>
  );
}
