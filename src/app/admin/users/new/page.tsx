import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserForm } from "@/features/users/components/user-form";
import { listDepartments } from "@/features/users/queries";
import { requireManager } from "@/lib/auth/dal";
import { isTopRole } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "إضافة مستخدم",
};

export default function NewUserPage() {
  return (
    <>
      <PageHeader
        title="إضافة مستخدم"
        actions={
          <Link
            href="/admin/users"
            className={buttonVariants({ variant: "outline" })}
          >
            العودة للقائمة
          </Link>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewUserForm />
      </Suspense>
    </>
  );
}

async function NewUserForm() {
  const viewer = await requireManager();
  const departments = isTopRole(viewer.role)
    ? await listDepartments({ activeOnly: true })
    : [];

  return (
    <Card className="max-w-2xl">
      <CardContent>
        <UserForm
          mode="create"
          viewerRole={viewer.role}
          viewerDepartmentName={viewer.departmentName}
          departments={departments}
          defaults={
            isTopRole(viewer.role)
              ? undefined
              : {
                  fullName: "",
                  employeeNo: "",
                  role: "employee",
                  departmentId: viewer.departmentId,
                  phone: null,
                  jobTitle: null,
                  notes: null,
                }
          }
        />
      </CardContent>
    </Card>
  );
}
