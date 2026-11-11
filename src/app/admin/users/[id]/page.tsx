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
  PasswordResetForm,
  UserStatusForm,
} from "@/features/users/components/account-forms";
import { UserForm } from "@/features/users/components/user-form";
import {
  canManageAccount,
  getUserForEdit,
  listDepartments,
} from "@/features/users/queries";
import { requireManager } from "@/lib/auth/dal";
import { ROLE_LABELS, isTopRole } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "بيانات المستخدم",
};

export default function UserPage({
  params,
  searchParams,
}: PageProps<"/admin/users/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <UserDetails params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function UserDetails({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireManager();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  const user = await getUserForEdit(id);
  if (!user) notFound();

  const [canManage, departments] = await Promise.all([
    canManageAccount(user.department_id, user.role),
    isTopRole(viewer.role)
      ? listDepartments({ activeOnly: true })
      : Promise.resolve([]),
  ]);
  const isSelf = user.id === viewer.id;
  const departmentName = user.department?.name ?? null;

  return (
    <>
      <PageHeader
        title={user.full_name}
        description={[ROLE_LABELS[user.role], departmentName]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <Link
            href="/admin/users"
            className={buttonVariants({ variant: "outline" })}
          >
            العودة للقائمة
          </Link>
        }
      />

      {query.created ? (
        <Alert className="mb-6" role="status">
          <AlertDescription>
            أُنشئ الحساب. أبلغ الموظف برقمه وكلمة المرور.
          </AlertDescription>
        </Alert>
      ) : null}

      {!canManage || !user.details ? (
        <Card className="max-w-2xl">
          <CardContent className="text-sm text-muted-foreground">
            هذا الحساب خارج نطاق إدارتك، فتظهر بياناته الأساسية فقط.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>بيانات الحساب</CardTitle>
            </CardHeader>
            <CardContent>
              <UserForm
                mode="edit"
                viewerRole={viewer.role}
                viewerDepartmentName={viewer.departmentName}
                departments={
                  departments.length > 0
                    ? departments
                    : user.department_id && departmentName
                      ? [{ id: user.department_id, name: departmentName }]
                      : []
                }
                lockRoleAndDepartment={isSelf}
                defaults={{
                  userId: user.id,
                  fullName: user.full_name,
                  employeeNo: user.details.employee_no,
                  role: user.role,
                  departmentId: user.department_id,
                  phone: user.details.phone,
                  jobTitle: user.details.job_title,
                  notes: user.details.notes,
                }}
              />
            </CardContent>
          </Card>

          <div className="space-y-6">
            {isSelf ? null : (
              <Card>
                <CardHeader>
                  <CardTitle>حالة الحساب</CardTitle>
                </CardHeader>
                <CardContent>
                  <UserStatusForm userId={user.id} isActive={user.is_active} />
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle>كلمة المرور</CardTitle>
              </CardHeader>
              <CardContent>
                <PasswordResetForm
                  userId={user.id}
                  employeeNo={user.details.employee_no}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
