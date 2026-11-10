"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ActionForm } from "@/components/action-form";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { type ActionState, firstFieldError } from "@/lib/action-state";

import {
  createTeamAction,
  setTeamMembersAction,
  updateTeamAction,
} from "../actions";

type Department = { id: string; name: string };
type Person = { id: string; full_name: string; department_id: string | null };

export function CreateTeamForm({
  departments,
}: {
  departments: Department[] | null;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createTeamAction,
    null,
  );

  return (
    <ActionForm
      action={formAction}
      state={state}
      resetOnSuccess
      className="space-y-3"
      noValidate
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field
          className="min-w-56 flex-1"
          data-invalid={Boolean(firstFieldError(state, "name"))}
        >
          <FieldLabel htmlFor="new-team">اسم الفريق الجديد</FieldLabel>
          <Input id="new-team" name="name" required />
        </Field>
        {departments ? (
          <Field
            className="min-w-48"
            data-invalid={Boolean(firstFieldError(state, "departmentId"))}
          >
            <FieldLabel htmlFor="new-team-department">القسم</FieldLabel>
            <NativeSelect
              id="new-team-department"
              name="departmentId"
              className="w-full"
              defaultValue=""
            >
              <NativeSelectOption value="">اختر القسم</NativeSelectOption>
              {departments.map((department) => (
                <NativeSelectOption key={department.id} value={department.id}>
                  {department.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
        <Button type="submit" disabled={pending}>
          إضافة فريق
        </Button>
      </div>
      <FieldError>
        {firstFieldError(state, "name") ??
          firstFieldError(state, "departmentId")}
      </FieldError>
      <FormMessage state={state} />
    </ActionForm>
  );
}

export function TeamCard({
  team,
  people,
}: {
  team: {
    id: string;
    name: string;
    is_active: boolean;
    departmentName: string | null;
    memberIds: string[];
  };
  people: Person[];
}) {
  const [updateState, updateAction, updating] = useActionState<
    ActionState,
    FormData
  >(updateTeamAction, null);
  const [membersState, membersAction, saving] = useActionState<
    ActionState,
    FormData
  >(setTeamMembersAction, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {team.name}
          {team.departmentName ? (
            <span className="text-sm font-normal text-muted-foreground">
              · {team.departmentName}
            </span>
          ) : null}
          {team.is_active ? null : (
            <span className="text-sm font-normal text-destructive">
              (موقوف)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <ActionForm
          action={updateAction}
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="teamId" value={team.id} />
          <Field className="min-w-56 flex-1">
            <FieldLabel htmlFor={`team-name-${team.id}`}>الاسم</FieldLabel>
            <Input
              id={`team-name-${team.id}`}
              name="name"
              defaultValue={team.name}
            />
          </Field>
          <input type="hidden" name="active" value={String(team.is_active)} />
          <Button type="submit" variant="outline" disabled={updating}>
            حفظ الاسم
          </Button>
        </ActionForm>
        <FormMessage state={updateState} />

        <ActionForm action={membersAction} className="space-y-3">
          <input type="hidden" name="teamId" value={team.id} />
          <fieldset>
            <legend className="mb-2 text-sm font-medium">الأعضاء</legend>
            {people.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا يوجد موظفون نشطون في هذا القسم.
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {people.map((person) => (
                  <li key={person.id}>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="members"
                        value={person.id}
                        defaultChecked={team.memberIds.includes(person.id)}
                        className="size-4 accent-primary"
                      />
                      {person.full_name}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
          <Button type="submit" disabled={saving}>
            حفظ الأعضاء
          </Button>
          <FormMessage state={membersState} />
        </ActionForm>

        <ActionForm action={updateAction}>
          <input type="hidden" name="teamId" value={team.id} />
          <input type="hidden" name="name" value={team.name} />
          <input type="hidden" name="active" value={String(!team.is_active)} />
          <Button type="submit" variant="ghost" size="sm" disabled={updating}>
            {team.is_active ? "إيقاف الفريق" : "تفعيل الفريق"}
          </Button>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
