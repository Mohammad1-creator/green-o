import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CreateTaskForm } from "@/features/tasks/components/task-forms";
import { getAssignmentOptions } from "@/features/tasks/queries";
import { requireManager } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "مهمة جديدة",
};

export default function NewTaskPage() {
  return (
    <>
      <PageHeader
        title="مهمة جديدة"
        actions={
          <Link
            href="/admin/tasks"
            className={buttonVariants({ variant: "outline" })}
          >
            العودة للمهام
          </Link>
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewTask />
      </Suspense>
    </>
  );
}

async function NewTask() {
  const viewer = await requireManager();
  const options = await getAssignmentOptions(viewer);

  return (
    <Card className="max-w-2xl">
      <CardContent>
        <CreateTaskForm
          departments={options.departments}
          people={options.people.map((p) => ({
            id: p.id,
            name: p.full_name,
            department_id: p.department_id,
          }))}
          teams={options.teams.map((t) => ({
            id: t.id,
            name: t.name,
            department_id: t.department_id,
          }))}
          fixedDepartmentId={
            viewer.role === "general_manager" ? null : viewer.departmentId
          }
        />
      </CardContent>
    </Card>
  );
}
