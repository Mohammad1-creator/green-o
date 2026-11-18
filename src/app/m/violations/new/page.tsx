import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/page-skeleton";
import { RecordViolationForm } from "@/features/safety/components/safety-forms";
import {
  listViolationTargets,
  listViolationTypes,
  nowInFactory,
} from "@/features/safety/queries";
import { requireUser } from "@/lib/auth/dal";
import { canRecordViolations } from "@/lib/auth/roles";
import { getFactorySettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "تسجيل مخالفة",
};

export default function NewViolationPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={4} />}>
      <NewViolation />
    </Suspense>
  );
}

async function NewViolation() {
  const user = await requireUser();
  if (!canRecordViolations(user.role)) redirect("/m/violations");
  const [targets, types, settings] = await Promise.all([
    listViolationTargets(user.id),
    listViolationTypes({ activeOnly: true }),
    getFactorySettings(),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">تسجيل مخالفة سلامة</h1>
      <p className="text-sm text-muted-foreground">
        يصل إشعار للموظف ولمدير قسمه، ويستطيع الموظف قبولها أو الاعتراض عليها.
      </p>
      <RecordViolationForm
        from="m"
        targets={targets.map((person) => ({
          id: person.id,
          name: person.full_name,
          department: person.department?.name ?? null,
        }))}
        types={types}
        defaultOccurredAt={nowInFactory(settings.timeZone)}
      />
    </div>
  );
}
