import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoleForm } from "@/features/permissions/components/role-form";
import { listDepartments, listManagedUsers } from "@/features/users/queries";
import { requireRole } from "@/lib/auth/dal";
import { type AppRole, ROLE_LABELS, TOP_ROLES } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "الصلاحيات",
};

/** What each role may do, in the order they appear in the role list. */
const ROLE_SUMMARY: Record<AppRole, string> = {
  developer:
    "كل صلاحيات المدير العام، ومعها ما يخص مدير الصيانة وحده: إسناد الإصلاح ورفض البلاغات.",
  general_manager:
    "كل الأقسام: المستخدمون والأدوار، والمهام، والصيانة، والإنتاج، والتقارير، والنقاط، وسجل التدقيق، والإعدادات.",
  maintenance_manager:
    "قسمه فقط: موظفوه وفرقه ومهامه، والآلات والصيانة الوقائية، وإسناد إصلاح الأعطال.",
  production_manager:
    "قسمه فقط: موظفوه وفرقه ومهامه، والمنتجات وأوامر الإنتاج وتسجيل الكميات.",
  employee:
    "تطبيق الجوال فقط: ما أُسند إليه من مهام ومراحل، والإبلاغ عن الأعطال.",
};

export default function PermissionsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Permissions />
    </Suspense>
  );
}

async function Permissions() {
  const viewer = await requireRole(TOP_ROLES);
  const [users, departments] = await Promise.all([
    listManagedUsers(viewer),
    listDepartments({ activeOnly: true }),
  ]);

  return (
    <>
      <PageHeader
        title="الصلاحيات"
        description="غيّر دور أي مستخدم لتمنحه صلاحيات أو تسحبها منه. يسري التغيير فوراً، ويُسجَّل في سجل التدقيق. لا يمكنك تغيير صلاحياتك بنفسك."
      />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>ماذا يستطيع كل دور</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[auto_1fr]">
              {(Object.keys(ROLE_SUMMARY) as AppRole[]).map((role) => (
                <div key={role} className="contents">
                  <dt className="font-semibold">{ROLE_LABELS[role]}</dt>
                  <dd className="text-muted-foreground">
                    {ROLE_SUMMARY[role]}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Table aria-label="أدوار المستخدمين">
          <TableHeader>
            <TableRow>
              <TableHead>المستخدم</TableHead>
              <TableHead>رقم الموظف</TableHead>
              <TableHead>الدور الحالي</TableHead>
              <TableHead>تغيير الدور</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.full_name}
                  {user.is_active ? null : (
                    <Badge variant="outline" className="ms-2">
                      موقوف
                    </Badge>
                  )}
                </TableCell>
                <TableCell dir="ltr" className="text-end tabular-nums">
                  {user.details?.employee_no}
                </TableCell>
                <TableCell>
                  {ROLE_LABELS[user.role]}
                  {user.department ? (
                    <span className="text-muted-foreground">
                      {" "}
                      · {user.department.name}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  {user.id === viewer.id ? (
                    <span className="text-sm text-muted-foreground">أنت</span>
                  ) : (
                    <RoleForm
                      userId={user.id}
                      userName={user.full_name}
                      role={user.role}
                      departmentId={user.department_id}
                      departments={departments}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
