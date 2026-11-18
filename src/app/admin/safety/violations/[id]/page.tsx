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
  CancelViolationForm,
  DecideObjectionForm,
} from "@/features/safety/components/safety-forms";
import { ViolationDetails } from "@/features/safety/components/violation-views";
import { violationCode } from "@/features/safety/labels";
import { getViolation } from "@/features/safety/queries";
import { requireManager } from "@/lib/auth/dal";
import { SAFETY_ROLES } from "@/lib/auth/roles";
import { getFactorySettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "مخالفة سلامة",
};

export default function ViolationPage({
  params,
  searchParams,
}: PageProps<"/admin/safety/violations/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Violation params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Violation({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireManager();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  const [violation, settings] = await Promise.all([
    getViolation(id),
    getFactorySettings(),
  ]);
  if (!violation) notFound();

  // The safety manager decides, never on a violation against themselves.
  const decides =
    SAFETY_ROLES.includes(viewer.role) && violation.employee_id !== viewer.id;

  return (
    <>
      <PageHeader
        title={`مخالفة ${violationCode(violation.number)}`}
        description={violation.type?.name}
        actions={
          <Link
            href="/admin/safety/violations"
            className={buttonVariants({ variant: "outline" })}
          >
            العودة للمخالفات
          </Link>
        }
      />
      {query.created ? (
        <Alert className="mb-6" role="status">
          <AlertDescription>
            سُجّلت المخالفة وأُرسل إشعار للموظف ولمدير قسمه.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardContent>
            <ViolationDetails
              violation={violation}
              timeZone={settings.timeZone}
            />
          </CardContent>
        </Card>
        {decides ? (
          <div className="space-y-6">
            {violation.status === "objected" ? (
              <Card>
                <CardHeader>
                  <CardTitle>البت في الاعتراض</CardTitle>
                </CardHeader>
                <CardContent>
                  <DecideObjectionForm violationId={violation.id} />
                </CardContent>
              </Card>
            ) : null}
            {violation.status !== "cancelled" ? (
              <Card>
                <CardHeader>
                  <CardTitle>إلغاء المخالفة</CardTitle>
                </CardHeader>
                <CardContent>
                  <CancelViolationForm violationId={violation.id} />
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
