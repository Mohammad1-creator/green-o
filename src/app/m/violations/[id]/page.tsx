import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { PageSkeleton } from "@/components/page-skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AnswerViolationForms } from "@/features/safety/components/safety-forms";
import { ViolationDetails } from "@/features/safety/components/violation-views";
import { violationCode } from "@/features/safety/labels";
import { getViolation } from "@/features/safety/queries";
import { requireUser } from "@/lib/auth/dal";
import { getFactorySettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "مخالفة سلامة",
};

export default function MobileViolationPage({
  params,
  searchParams,
}: PageProps<"/m/violations/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <MobileViolation params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function MobileViolation({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  const [violation, settings] = await Promise.all([
    getViolation(id),
    getFactorySettings(),
  ]);
  if (!violation) notFound();
  const isMine = violation.employee_id === user.id;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground" dir="ltr">
          {violationCode(violation.number)}
        </p>
        <h1 className="text-xl font-bold">مخالفة سلامة</h1>
      </div>
      {query.created ? (
        <Alert role="status">
          <AlertDescription>
            سُجّلت المخالفة وأُرسل إشعار للموظف.
          </AlertDescription>
        </Alert>
      ) : null}
      {isMine && violation.status === "pending" ? (
        <Alert role="status">
          <AlertDescription>
            سُجّلت عليك هذه المخالفة. راجعها، ثم اقبلها أو اعترض عليها مع ذكر
            السبب.
          </AlertDescription>
        </Alert>
      ) : null}
      <ViolationDetails violation={violation} timeZone={settings.timeZone} />
      {isMine && violation.status === "pending" ? (
        <AnswerViolationForms violationId={violation.id} />
      ) : null}
    </div>
  );
}
