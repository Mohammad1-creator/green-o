"use client";

import { useActionState, useState } from "react";

import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm } from "@/components/action-form";
import { type ActionState, firstFieldError } from "@/lib/action-state";

import {
  createTaskAction,
  reassignTaskAction,
  updateTaskAction,
} from "../actions";

import { type AssignOption, AssignmentFields } from "./assignment-fields";

function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Spinner /> : null}
      {children}
    </Button>
  );
}

function TaskTextFields({
  state,
  defaults,
}: {
  state: ActionState;
  defaults?: { title: string; description: string | null; dueLocal: string };
}) {
  return (
    <>
      <Field data-invalid={Boolean(firstFieldError(state, "title"))}>
        <FieldLabel htmlFor="title">العنوان</FieldLabel>
        <Input
          id="title"
          name="title"
          defaultValue={defaults?.title}
          required
          maxLength={200}
        />
        <FieldError>{firstFieldError(state, "title")}</FieldError>
      </Field>
      <Field data-invalid={Boolean(firstFieldError(state, "description"))}>
        <FieldLabel htmlFor="description">التفاصيل (اختياري)</FieldLabel>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={defaults?.description ?? ""}
        />
        <FieldError>{firstFieldError(state, "description")}</FieldError>
      </Field>
      <Field data-invalid={Boolean(firstFieldError(state, "due"))}>
        <FieldLabel htmlFor="due">موعد الاستحقاق (اختياري)</FieldLabel>
        <Input
          id="due"
          name="due"
          type="datetime-local"
          dir="ltr"
          className="text-start"
          defaultValue={defaults?.dueLocal}
        />
        <FieldDescription>
          بتوقيت المصنع. بعده تظهر المهمة «متأخرة» إن لم تُسلَّم.
        </FieldDescription>
        <FieldError>{firstFieldError(state, "due")}</FieldError>
      </Field>
    </>
  );
}

export function CreateTaskForm({
  departments,
  people,
  teams,
  fixedDepartmentId,
}: {
  departments: { id: string; name: string }[];
  people: AssignOption[];
  teams: AssignOption[];
  /** A department manager always creates tasks for their own department. */
  fixedDepartmentId: string | null;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createTaskAction,
    null,
  );
  const [departmentId, setDepartmentId] = useState(fixedDepartmentId ?? "");

  return (
    <ActionForm action={formAction} noValidate>
      <FieldGroup>
        <TaskTextFields state={state} />
        {fixedDepartmentId ? null : (
          <Field data-invalid={Boolean(firstFieldError(state, "departmentId"))}>
            <FieldLabel htmlFor="departmentId">القسم</FieldLabel>
            <NativeSelect
              id="departmentId"
              name="departmentId"
              className="w-full"
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
            >
              <NativeSelectOption value="">اختر القسم</NativeSelectOption>
              {departments.map((department) => (
                <NativeSelectOption key={department.id} value={department.id}>
                  {department.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError>{firstFieldError(state, "departmentId")}</FieldError>
          </Field>
        )}
        {departmentId ? (
          <AssignmentFields
            key={departmentId}
            departmentId={departmentId}
            people={people}
            teams={teams}
            errors={{
              assigneeId: firstFieldError(state, "assigneeId"),
              teamId: firstFieldError(state, "teamId"),
            }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            اختر القسم لتظهر قائمة الموظفين والفرق.
          </p>
        )}
        <FormMessage state={state} />
        <div>
          <SubmitButton pending={pending}>إنشاء المهمة</SubmitButton>
        </div>
      </FieldGroup>
    </ActionForm>
  );
}

export function EditTaskForm({
  taskId,
  defaults,
}: {
  taskId: string;
  defaults: { title: string; description: string | null; dueLocal: string };
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateTaskAction,
    null,
  );
  return (
    <ActionForm action={formAction} noValidate>
      <input type="hidden" name="taskId" value={taskId} />
      <FieldGroup>
        <TaskTextFields state={state} defaults={defaults} />
        <FormMessage state={state} />
        <div>
          <SubmitButton pending={pending}>حفظ التعديلات</SubmitButton>
        </div>
      </FieldGroup>
    </ActionForm>
  );
}

export function ReassignTaskForm({
  taskId,
  departmentId,
  people,
  teams,
  defaultMode,
}: {
  taskId: string;
  departmentId: string;
  people: AssignOption[];
  teams: AssignOption[];
  defaultMode: "person" | "team";
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    reassignTaskAction,
    null,
  );
  return (
    <ActionForm action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="taskId" value={taskId} />
      <AssignmentFields
        departmentId={departmentId}
        people={people}
        teams={teams}
        defaultMode={defaultMode}
        errors={{
          assigneeId: firstFieldError(state, "assigneeId"),
          teamId: firstFieldError(state, "teamId"),
        }}
      />
      <FormMessage state={state} />
      <SubmitButton pending={pending}>تغيير الإسناد</SubmitButton>
    </ActionForm>
  );
}
