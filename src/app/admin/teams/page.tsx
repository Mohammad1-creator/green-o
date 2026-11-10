import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  CreateTeamForm,
  TeamCard,
} from "@/features/teams/components/team-forms";
import { listActivePeople, listManagedTeams } from "@/features/teams/queries";
import { listDepartments } from "@/features/users/queries";
import { requireManager } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "الفرق",
};

export default function TeamsPage() {
  return (
    <>
      <PageHeader
        title="الفرق"
        description="الفريق مجموعة من موظفي قسم واحد. عند إسناد مهمة لفريق تصل إلى كل أعضائه."
      />
      <Suspense fallback={<PageSkeleton />}>
        <Teams />
      </Suspense>
    </>
  );
}

async function Teams() {
  const viewer = await requireManager();
  const isGm = viewer.role === "general_manager";
  const [teams, departments] = await Promise.all([
    listManagedTeams(viewer),
    isGm ? listDepartments({ activeOnly: true }) : Promise.resolve(null),
  ]);
  const departmentIds = [...new Set(teams.map((team) => team.department_id))];
  const people = await listActivePeople(departmentIds);

  return (
    <div className="max-w-4xl space-y-6">
      <Card>
        <CardContent>
          <CreateTeamForm departments={departments} />
        </CardContent>
      </Card>
      {teams.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد فرق بعد.</p>
      ) : (
        teams.map((team) => (
          <TeamCard
            key={team.id}
            team={{
              id: team.id,
              name: team.name,
              is_active: team.is_active,
              departmentName: isGm ? (team.department?.name ?? null) : null,
              memberIds: team.members.map((member) => member.user_id),
            }}
            people={people.filter(
              (person) => person.department_id === team.department_id,
            )}
          />
        ))
      )}
    </div>
  );
}
