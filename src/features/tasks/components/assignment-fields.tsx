"use client";

import { useState } from "react";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

export type AssignOption = {
  id: string;
  name: string;
  department_id: string | null;
};

/** "To a person" or "to a team", limited to one department. */
export function AssignmentFields({
  departmentId,
  people,
  teams,
  errors,
  defaultMode = "person",
}: {
  departmentId: string;
  people: AssignOption[];
  teams: AssignOption[];
  errors?: { assigneeId?: string; teamId?: string };
  defaultMode?: "person" | "team";
}) {
  const [mode, setMode] = useState<"person" | "team">(defaultMode);
  const departmentPeople = people.filter(
    (person) => person.department_id === departmentId,
  );
  const departmentTeams = teams.filter(
    (team) => team.department_id === departmentId,
  );

  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-sm font-medium">الإسناد إلى</legend>
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="assignMode"
            value="person"
            checked={mode === "person"}
            onChange={() => setMode("person")}
            className="size-4 accent-primary"
          />
          موظف
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="assignMode"
            value="team"
            checked={mode === "team"}
            onChange={() => setMode("team")}
            className="size-4 accent-primary"
          />
          فريق
        </label>
      </div>

      {mode === "person" ? (
        <Field data-invalid={Boolean(errors?.assigneeId)}>
          <FieldLabel htmlFor="assigneeId">الموظف</FieldLabel>
          <NativeSelect
            id="assigneeId"
            name="assigneeId"
            className="w-full"
            defaultValue=""
          >
            <NativeSelectOption value="">اختر الموظف</NativeSelectOption>
            {departmentPeople.map((person) => (
              <NativeSelectOption key={person.id} value={person.id}>
                {person.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError>{errors?.assigneeId}</FieldError>
        </Field>
      ) : (
        <Field data-invalid={Boolean(errors?.teamId)}>
          <FieldLabel htmlFor="teamId">الفريق</FieldLabel>
          <NativeSelect
            id="teamId"
            name="teamId"
            className="w-full"
            defaultValue=""
          >
            <NativeSelectOption value="">اختر الفريق</NativeSelectOption>
            {departmentTeams.map((team) => (
              <NativeSelectOption key={team.id} value={team.id}>
                {team.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {departmentTeams.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              لا توجد فرق في هذا القسم. أنشئها من صفحة «الفرق».
            </p>
          ) : null}
          <FieldError>{errors?.teamId}</FieldError>
        </Field>
      )}
    </fieldset>
  );
}
