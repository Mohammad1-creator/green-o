"use client";

import { useActionState } from "react";

import { ActionForm } from "@/components/action-form";
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
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { type ActionState, firstFieldError } from "@/lib/action-state";

import {
  acceptViolationAction,
  cancelViolationAction,
  createViolationTypeAction,
  decideObjectionAction,
  objectViolationAction,
  recordViolationAction,
  updateViolationTypeAction,
} from "../actions";
import { SEVERITIES, SEVERITY_LABELS, type ViolationSeverity } from "../labels";

type Target = { id: string; name: string; department: string | null };
type TypeOption = {
  id: string;
  name: string;
  severity: ViolationSeverity;
  points: number;
};

function groupByDepartment(targets: Target[]) {
  const groups = new Map<string, Target[]>();
  for (const target of targets) {
    const key = target.department ?? "بلا قسم";
    groups.set(key, [...(groups.get(key) ?? []), target]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "ar"));
}

export function RecordViolationForm({
  from,
  targets,
  types,
  defaultOccurredAt,
}: {
  from: "m" | "admin";
  targets: Target[];
  types: TypeOption[];
  /** "YYYY-MM-DDTHH:mm" in factory time. */
  defaultOccurredAt: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    recordViolationAction,
    null,
  );
  const error = (name: string) => firstFieldError(state, name);

  return (
    <ActionForm action={formAction} noValidate>
      <input type="hidden" name="from" value={from} />
      <FieldGroup>
        <Field data-invalid={Boolean(error("employeeId"))}>
          <FieldLabel htmlFor="employeeId">الموظف</FieldLabel>
          <NativeSelect id="employeeId" name="employeeId" defaultValue="">
            <NativeSelectOption value="">اختر الموظف</NativeSelectOption>
            {groupByDepartment(targets).map(([department, people]) => (
              <NativeSelectOptGroup key={department} label={department}>
                {people.map((person) => (
                  <NativeSelectOption key={person.id} value={person.id}>
                    {person.name}
                  </NativeSelectOption>
                ))}
              </NativeSelectOptGroup>
            ))}
          </NativeSelect>
          <FieldError>{error("employeeId")}</FieldError>
        </Field>

        <Field data-invalid={Boolean(error("typeId"))}>
          <FieldLabel htmlFor="typeId">نوع المخالفة</FieldLabel>
          <NativeSelect id="typeId" name="typeId" defaultValue="">
            <NativeSelectOption value="">اختر النوع</NativeSelectOption>
            {types.map((type) => (
              <NativeSelectOption key={type.id} value={type.id}>
                {type.name} · {SEVERITY_LABELS[type.severity]} · خصم{" "}
                {type.points}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {types.length === 0 ? (
            <FieldDescription>
              لا توجد أنواع مخالفات بعد. يضيفها مدير السلامة من لوحة الإدارة.
            </FieldDescription>
          ) : null}
          <FieldError>{error("typeId")}</FieldError>
        </Field>

        <Field data-invalid={Boolean(error("description"))}>
          <FieldLabel htmlFor="description">ماذا حدث؟</FieldLabel>
          <Textarea
            id="description"
            name="description"
            rows={3}
            maxLength={2000}
            required
          />
          <FieldError>{error("description")}</FieldError>
        </Field>

        <Field data-invalid={Boolean(error("location"))}>
          <FieldLabel htmlFor="location">المكان (اختياري)</FieldLabel>
          <Input id="location" name="location" maxLength={200} />
          <FieldError>{error("location")}</FieldError>
        </Field>

        <Field data-invalid={Boolean(error("occurredAt"))}>
          <FieldLabel htmlFor="occurredAt">وقت المخالفة</FieldLabel>
          <Input
            id="occurredAt"
            name="occurredAt"
            type="datetime-local"
            dir="ltr"
            className="w-auto text-start"
            defaultValue={defaultOccurredAt}
          />
          <FieldDescription>بتوقيت المصنع، خلال آخر 30 يوماً.</FieldDescription>
          <FieldError>{error("occurredAt")}</FieldError>
        </Field>

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Spinner /> : null}
          تسجيل المخالفة
        </Button>
        {state && !state.ok ? <FormMessage state={state} /> : null}
      </FieldGroup>
    </ActionForm>
  );
}

/** The employee accepts the violation or objects with a reason. */
export function AnswerViolationForms({ violationId }: { violationId: string }) {
  const [acceptState, acceptAction, accepting] = useActionState<
    ActionState,
    FormData
  >(acceptViolationAction, null);
  const [objectState, objectAction, objecting] = useActionState<
    ActionState,
    FormData
  >(objectViolationAction, null);
  const reasonError = firstFieldError(objectState, "reason");

  return (
    <div className="space-y-5">
      <ActionForm
        action={acceptAction}
        confirm="قبول المخالفة؟ لن تستطيع الاعتراض عليها بعد ذلك."
      >
        <input type="hidden" name="violationId" value={violationId} />
        <Button type="submit" size="lg" className="w-full" disabled={accepting}>
          {accepting ? <Spinner /> : null}
          اطّلعت وأقبل المخالفة
        </Button>
        {acceptState && !acceptState.ok ? (
          <FormMessage state={acceptState} />
        ) : null}
      </ActionForm>

      <ActionForm action={objectAction} className="space-y-2" noValidate>
        <input type="hidden" name="violationId" value={violationId} />
        <Field data-invalid={Boolean(reasonError)}>
          <FieldLabel htmlFor={`objection-${violationId}`}>
            أو اعترض عليها مع ذكر السبب
          </FieldLabel>
          <Textarea
            id={`objection-${violationId}`}
            name="reason"
            rows={3}
            maxLength={1000}
          />
          <FieldError>{reasonError}</FieldError>
        </Field>
        <Button
          type="submit"
          variant="outline"
          size="lg"
          className="w-full"
          disabled={objecting}
        >
          {objecting ? <Spinner /> : null}
          إرسال الاعتراض
        </Button>
        {objectState && !objectState.ok && !reasonError ? (
          <FormMessage state={objectState} />
        ) : null}
      </ActionForm>
    </div>
  );
}

export function DecideObjectionForm({ violationId }: { violationId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    decideObjectionAction,
    null,
  );
  const noteError = firstFieldError(state, "note");
  return (
    <ActionForm action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="violationId" value={violationId} />
      <Field data-invalid={Boolean(noteError)}>
        <FieldLabel htmlFor={`decision-${violationId}`}>سبب القرار</FieldLabel>
        <Textarea
          id={`decision-${violationId}`}
          name="note"
          rows={2}
          maxLength={1000}
        />
        <FieldError>{noteError}</FieldError>
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="decision" value="reject" disabled={pending}>
          رفض الاعتراض (تثبت المخالفة)
        </Button>
        <Button
          type="submit"
          name="decision"
          value="uphold"
          variant="outline"
          disabled={pending}
        >
          قبول الاعتراض (تُلغى المخالفة)
        </Button>
      </div>
      <FormMessage state={state} />
    </ActionForm>
  );
}

export function CancelViolationForm({ violationId }: { violationId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    cancelViolationAction,
    null,
  );
  const reasonError = firstFieldError(state, "reason");
  return (
    <ActionForm action={formAction} className="space-y-2" noValidate>
      <input type="hidden" name="violationId" value={violationId} />
      <Field data-invalid={Boolean(reasonError)}>
        <FieldLabel htmlFor={`cancel-${violationId}`}>سبب الإلغاء</FieldLabel>
        <Input id={`cancel-${violationId}`} name="reason" maxLength={1000} />
        <FieldError>{reasonError}</FieldError>
      </Field>
      <Button type="submit" variant="destructive" disabled={pending}>
        إلغاء المخالفة
      </Button>
      <FormMessage state={state} />
    </ActionForm>
  );
}

export function ViolationTypeForm({
  defaults,
}: {
  defaults?: {
    id: string;
    name: string;
    severity: ViolationSeverity;
    points: number;
    description: string | null;
    isActive: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    defaults ? updateViolationTypeAction : createViolationTypeAction,
    null,
  );
  const prefix = defaults?.id ?? "new";
  const error = (name: string) => firstFieldError(state, name);
  return (
    <ActionForm
      action={formAction}
      state={state}
      resetOnSuccess={!defaults}
      className="grid gap-3 sm:grid-cols-[2fr_1fr_7rem_auto] sm:items-end"
      noValidate
    >
      {defaults ? (
        <input type="hidden" name="typeId" value={defaults.id} />
      ) : null}
      <Field data-invalid={Boolean(error("name"))}>
        <FieldLabel htmlFor={`${prefix}-name`}>اسم المخالفة</FieldLabel>
        <Input
          id={`${prefix}-name`}
          name="name"
          defaultValue={defaults?.name}
          maxLength={120}
        />
        <FieldError>{error("name")}</FieldError>
      </Field>
      <Field data-invalid={Boolean(error("severity"))}>
        <FieldLabel htmlFor={`${prefix}-severity`}>الخطورة</FieldLabel>
        <NativeSelect
          id={`${prefix}-severity`}
          name="severity"
          defaultValue={defaults?.severity ?? "medium"}
        >
          {SEVERITIES.map((severity) => (
            <NativeSelectOption key={severity} value={severity}>
              {SEVERITY_LABELS[severity]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field data-invalid={Boolean(error("points"))}>
        <FieldLabel htmlFor={`${prefix}-points`}>نقاط الخصم</FieldLabel>
        <Input
          id={`${prefix}-points`}
          name="points"
          inputMode="numeric"
          dir="ltr"
          className="text-start tabular-nums"
          defaultValue={defaults ? String(defaults.points) : "0"}
        />
        <FieldError>{error("points")}</FieldError>
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        {defaults ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={defaults.isActive}
              className="size-4"
            />
            مفعّل
          </label>
        ) : null}
        <Button
          type="submit"
          disabled={pending}
          variant={defaults ? "outline" : "default"}
        >
          {defaults ? "حفظ" : "إضافة"}
        </Button>
      </div>
      <Field className="sm:col-span-4">
        <FieldLabel htmlFor={`${prefix}-description`}>
          الوصف (اختياري)
        </FieldLabel>
        <Input
          id={`${prefix}-description`}
          name="description"
          defaultValue={defaults?.description ?? ""}
          maxLength={1000}
        />
      </Field>
      <div className="sm:col-span-4">
        <FormMessage state={state} />
      </div>
    </ActionForm>
  );
}
