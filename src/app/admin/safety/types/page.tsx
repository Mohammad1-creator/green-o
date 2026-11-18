import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ViolationTypeForm } from "@/features/safety/components/safety-forms";
import { listViolationTypes } from "@/features/safety/queries";
import { requireRole } from "@/lib/auth/dal";
import { SAFETY_ROLES } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "أنواع المخالفات",
};

export default function ViolationTypesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ViolationTypes />
    </Suspense>
  );
}

async function ViolationTypes() {
  await requireRole(SAFETY_ROLES);
  const types = await listViolationTypes();
  return (
    <>
      <PageHeader
        title="أنواع المخالفات"
        description="لكل نوع درجة خطورة ونقاط تُخصم من ترتيب الموظف. تغيير النقاط لا يمس المخالفات المسجّلة سابقاً، والنوع الموقوف لا يظهر عند التسجيل."
      />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>نوع جديد</CardTitle>
          </CardHeader>
          <CardContent>
            <ViolationTypeForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>الأنواع ({types.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {types.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد أنواع بعد.
              </p>
            ) : (
              <ul className="divide-y" aria-label="أنواع المخالفات">
                {types.map((type) => (
                  <li key={type.id} className="py-4 first:pt-0">
                    <ViolationTypeForm
                      defaults={{
                        id: type.id,
                        name: type.name,
                        severity: type.severity,
                        points: type.points,
                        description: type.description,
                        isActive: type.is_active,
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
