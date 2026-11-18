import { ShieldAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/page-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { ViolationCards } from "@/features/safety/components/violation-views";
import {
  listMyViolations,
  listRecordedViolations,
} from "@/features/safety/queries";
import { requireUser } from "@/lib/auth/dal";
import { canRecordViolations } from "@/lib/auth/roles";
import { getFactorySettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "السلامة",
};

export default function MobileViolationsPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <Violations />
    </Suspense>
  );
}

async function Violations() {
  const user = await requireUser();
  const records = canRecordViolations(user.role);
  const [mine, recorded, settings] = await Promise.all([
    listMyViolations(user.id),
    records ? listRecordedViolations(user.id) : Promise.resolve([]),
    getFactorySettings(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">السلامة المهنية</h1>
      {records ? (
        <Link
          href="/m/violations/new"
          className={buttonVariants({ size: "lg", className: "w-full" })}
        >
          <ShieldAlertIcon />
          تسجيل مخالفة
        </Link>
      ) : null}

      <section className="space-y-3" aria-labelledby="my-violations">
        <h2 id="my-violations" className="font-semibold">
          مخالفاتي
        </h2>
        {mine.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            لا توجد عليك مخالفات. شكراً لالتزامك بالسلامة.
          </p>
        ) : (
          <ViolationCards
            violations={mine}
            hrefBase="/m/violations"
            timeZone={settings.timeZone}
          />
        )}
      </section>

      {records ? (
        <section className="space-y-3" aria-labelledby="recorded-violations">
          <h2 id="recorded-violations" className="font-semibold">
            مخالفات سجّلتها
          </h2>
          {recorded.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              لم تسجّل مخالفات بعد.
            </p>
          ) : (
            <ViolationCards
              violations={recorded}
              hrefBase="/m/violations"
              timeZone={settings.timeZone}
              showEmployee
            />
          )}
        </section>
      ) : null}
    </div>
  );
}
