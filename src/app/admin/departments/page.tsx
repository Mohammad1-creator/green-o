import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  CreateDepartmentForm,
  DepartmentRow,
} from "@/features/departments/components/department-forms";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { TOP_ROLES } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "الأقسام",
};

export default function DepartmentsPage() {
  return (
    <>
      <PageHeader
        title="الأقسام"
        description="كل موظف ينتمي إلى قسم واحد. لا يمكن إيقاف قسم فيه موظفون نشطون."
      />
      <Suspense fallback={<PageSkeleton />}>
        <Departments />
      </Suspense>
    </>
  );
}

async function Departments() {
  await requireRole(TOP_ROLES);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("departments")
    .select("id, name, is_active, profiles(count)")
    .order("is_active", { ascending: false })
    .order("name");
  if (error) throw error;

  return (
    <div className="max-w-3xl space-y-6">
      <Card>
        <CardContent>
          <CreateDepartmentForm />
        </CardContent>
      </Card>
      <ul className="space-y-3">
        {data.map((department) => (
          <DepartmentRow
            key={department.id}
            id={department.id}
            name={department.name}
            isActive={department.is_active}
            memberCount={department.profiles[0]?.count ?? 0}
          />
        ))}
      </ul>
    </div>
  );
}
