import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listManagedUsers } from "@/features/users/queries";
import { requireManager } from "@/lib/auth/dal";
import { ROLE_LABELS } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "المستخدمون",
};

export default function UsersPage() {
  return (
    <>
      <PageHeader
        title="المستخدمون"
        description="حسابات الدخول للموظفين والمديرين."
        actions={
          <Link href="/admin/users/new" className={buttonVariants()}>
            <PlusIcon />
            إضافة مستخدم
          </Link>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <UsersTable />
      </Suspense>
    </>
  );
}

async function UsersTable() {
  const viewer = await requireManager();
  const users = await listManagedUsers(viewer);

  if (users.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>لا يوجد مستخدمون بعد</EmptyTitle>
          <EmptyDescription>
            أضف أول مستخدم من زر «إضافة مستخدم».
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>الاسم</TableHead>
          <TableHead>رقم الموظف</TableHead>
          <TableHead>الدور</TableHead>
          <TableHead>القسم</TableHead>
          <TableHead>الحالة</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>
              <Link
                href={`/admin/users/${user.id}`}
                className="font-medium hover:underline"
              >
                {user.full_name}
              </Link>
              {user.details?.job_title ? (
                <div className="text-xs text-muted-foreground">
                  {user.details.job_title}
                </div>
              ) : null}
            </TableCell>
            <TableCell dir="ltr" className="text-end">
              {user.details?.employee_no ?? "—"}
            </TableCell>
            <TableCell>{ROLE_LABELS[user.role]}</TableCell>
            <TableCell>{user.department?.name ?? "—"}</TableCell>
            <TableCell>
              {user.is_active ? (
                <Badge variant="secondary">نشط</Badge>
              ) : (
                <Badge variant="destructive">موقوف</Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
