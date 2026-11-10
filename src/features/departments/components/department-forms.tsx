"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ActionForm } from "@/components/action-form";
import { type ActionState, firstFieldError } from "@/lib/action-state";

import {
  createDepartmentAction,
  renameDepartmentAction,
  setDepartmentActiveAction,
} from "../actions";

export function CreateDepartmentForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createDepartmentAction,
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
      <Field data-invalid={Boolean(firstFieldError(state, "name"))}>
        <FieldLabel htmlFor="new-department">اسم القسم الجديد</FieldLabel>
        <div className="flex gap-2">
          <Input id="new-department" name="name" required />
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null}
            إضافة
          </Button>
        </div>
        <FieldError>{firstFieldError(state, "name")}</FieldError>
      </Field>
      <FormMessage state={state} />
    </ActionForm>
  );
}

export function DepartmentRow({
  id,
  name,
  isActive,
  memberCount,
}: {
  id: string;
  name: string;
  isActive: boolean;
  memberCount: number;
}) {
  const [renameState, renameAction, renaming] = useActionState<
    ActionState,
    FormData
  >(renameDepartmentAction, null);
  const [statusState, statusAction, switching] = useActionState<
    ActionState,
    FormData
  >(setDepartmentActiveAction, null);

  return (
    <li className="space-y-2 rounded-lg border p-4">
      <div className="flex flex-wrap items-end gap-3">
        <ActionForm
          action={renameAction}
          className="flex min-w-64 flex-1 items-end gap-2"
        >
          <input type="hidden" name="departmentId" value={id} />
          <Field className="flex-1">
            <FieldLabel htmlFor={`department-${id}`} className="sr-only">
              اسم القسم
            </FieldLabel>
            <Input id={`department-${id}`} name="name" defaultValue={name} />
          </Field>
          <Button type="submit" variant="outline" disabled={renaming}>
            حفظ الاسم
          </Button>
        </ActionForm>
        <ActionForm action={statusAction}>
          <input type="hidden" name="departmentId" value={id} />
          <input
            type="hidden"
            name="active"
            value={isActive ? "false" : "true"}
          />
          <Button
            type="submit"
            variant={isActive ? "ghost" : "default"}
            disabled={switching}
          >
            {isActive ? "إيقاف القسم" : "تفعيل القسم"}
          </Button>
        </ActionForm>
      </div>
      <p className="text-xs text-muted-foreground">
        {memberCount} مستخدم{isActive ? "" : " · القسم موقوف"}
      </p>
      <FormMessage state={renameState} />
      <FormMessage state={statusState} />
    </li>
  );
}
