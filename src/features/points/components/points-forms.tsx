"use client";

import { useActionState } from "react";

import { ActionForm } from "@/components/action-form";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { type ActionState, firstFieldError } from "@/lib/action-state";

import { awardPointsAction, voidPointsAction } from "../actions";
import { POINTS_MAX, POINTS_MIN, pointsField } from "../schemas";

export function AwardPointsForm({
  taskId,
  people,
}: {
  taskId: string;
  people: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    awardPointsAction,
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
      <input type="hidden" name="taskId" value={taskId} />
      <p className="text-sm text-muted-foreground">
        اكتب نقاط كل موظف حسب جهده، واترك الحقل فارغاً لمن لا تمنحه نقاطاً.
      </p>
      {people.map((person) => {
        const name = pointsField(person.id);
        const error = firstFieldError(state, name);
        return (
          <Field
            key={person.id}
            data-invalid={Boolean(error)}
            className="grid grid-cols-[1fr_7rem] items-center gap-3"
          >
            <FieldLabel htmlFor={`${taskId}-${name}`}>{person.name}</FieldLabel>
            <Input
              id={`${taskId}-${name}`}
              name={name}
              inputMode="numeric"
              dir="ltr"
              min={POINTS_MIN}
              max={POINTS_MAX}
              placeholder="0"
              aria-invalid={Boolean(error)}
              className="text-start tabular-nums"
            />
            <FieldError className="col-span-2">{error}</FieldError>
          </Field>
        );
      })}
      <Field>
        <FieldLabel htmlFor={`${taskId}-points-note`}>
          ملاحظة (اختيارية)
        </FieldLabel>
        <Input id={`${taskId}-points-note`} name="note" maxLength={500} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? <Spinner /> : null}
        إضافة النقاط
      </Button>
      <FormMessage state={state} />
    </ActionForm>
  );
}

export function VoidPointsForm({
  taskId,
  pointsId,
}: {
  taskId: string;
  pointsId: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    voidPointsAction,
    null,
  );
  const error = firstFieldError(state, "reason");
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted-foreground">إلغاء</summary>
      <ActionForm action={formAction} className="mt-2 space-y-2" noValidate>
        <input type="hidden" name="taskId" value={taskId} />
        <input type="hidden" name="pointsId" value={pointsId} />
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor={`void-${pointsId}`}>سبب الإلغاء</FieldLabel>
          <div className="flex flex-wrap gap-2">
            <Input
              id={`void-${pointsId}`}
              name="reason"
              maxLength={500}
              required
              className="min-w-0 flex-1"
            />
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={pending}
            >
              إلغاء النقاط
            </Button>
          </div>
          <FieldError>{error}</FieldError>
        </Field>
        {state && !state.ok && !error ? <FormMessage state={state} /> : null}
      </ActionForm>
    </details>
  );
}
