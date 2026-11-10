import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MachineStatusBadge } from "@/features/maintenance/components/badges";
import { MachineForm } from "@/features/maintenance/components/maintenance-forms";
import { listMachines } from "@/features/maintenance/queries";
import { listDepartments } from "@/features/users/queries";
import { requireRole } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "الآلات",
};

export default function MachinesPage() {
  return (
    <>
      <PageHeader title="الآلات" description="سجل آلات المصنع وحالتها." />
      <Suspense fallback={<PageSkeleton />}>
        <Machines />
      </Suspense>
    </>
  );
}

async function Machines() {
  await requireRole(["general_manager", "maintenance_manager"]);
  const [machines, departments] = await Promise.all([
    listMachines(),
    listDepartments({ activeOnly: true }),
  ]);

  return (
    <div className="space-y-6">
      {machines.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الرمز</TableHead>
              <TableHead>الآلة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>القسم</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {machines.map((machine) => (
              <TableRow key={machine.id}>
                <TableCell dir="ltr" className="text-end">
                  {machine.code}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/maintenance/machines/${machine.id}`}
                    className="font-medium hover:underline"
                  >
                    {machine.name}
                  </Link>
                  {machine.manufacturer ? (
                    <div className="text-xs text-muted-foreground">
                      {machine.manufacturer} {machine.model ?? ""}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell>
                  <MachineStatusBadge status={machine.status} />
                </TableCell>
                <TableCell>{machine.department?.name ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">لم تُسجَّل آلات بعد.</p>
      )}

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>إضافة آلة</CardTitle>
        </CardHeader>
        <CardContent>
          <MachineForm departments={departments} />
        </CardContent>
      </Card>
    </div>
  );
}
