import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { RecordViolationForm } from "@/features/safety/components/safety-forms";
import {
  listViolationTargets,
  listViolationTypes,
  nowInFactory,
} from "@/features/safety/queries";
import { requireRole } from "@/lib/auth/dal";
import { SAFETY_ROLES } from "@/lib/auth/roles";
import { getFactorySettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "تسجيل مخالفة",
};

export default function NewViolationPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewViolation />
    </Suspense>
  );
}

async function NewViolation() {
  const viewer = await requireRole(SAFETY_ROLES);
  const [targets, types, settings] = await Promise.all([
    listViolationTargets(viewer.id),
    listViolationTypes({ activeOnly: true }),
    getFactorySettings(),
  ]);
  return (
    <>
      <PageHeader
        title="تسجيل مخالفة سلامة"
        description="يصل إشعار للموظف ولمدير قسمه، ويستطيع الموظف قبولها أو الاعتراض عليها."
      />
      <Card className="max-w-2xl">
        <CardContent>
          <RecordViolationForm
            from="admin"
            targets={targets.map((person) => ({
              id: person.id,
              name: person.full_name,
              department: person.department?.name ?? null,
            }))}
            types={types}
            defaultOccurredAt={nowInFactory(settings.timeZone)}
          />
        </CardContent>
      </Card>
    </>
  );
}
