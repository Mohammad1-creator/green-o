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
import {
  type AssignOption,
  AssignmentFields,
} from "@/features/tasks/components/assignment-fields";
import { type ActionState, firstFieldError } from "@/lib/action-state";

import {
  INTERVAL_UNIT_LABELS,
  INTERVAL_UNITS,
  type IntervalUnit,
} from "../labels";
import {
  runPmGenerationAction,
  savePmPlanAction,
  setPmPlanActiveAction,
} from "../pm-actions";

export type PmPlanDefaults = {
  id: string;
  machineName: string;
  title: string;
  instructions: string | null;
  intervalUnit: IntervalUnit;
  intervalCount: number;
  startDate: string;
  leadDays: number;
  departmentId: string;
  assigneeUserId: string | null;
  assigneeTeamId: string | null;
};

export function PmPlanForm({
  defaults,
  machines = [],
  defaultMachineId,
  departments,
  people,
  teams,
  fixedDepartmentId,
  today,
}: {
  defaults?: PmPlanDefaults;
  machines?: { id: string; code: string; name: string }[];
  defaultMachineId?: string;
  departments: { id: string; name: string }[];
  people: AssignOption[];
  teams: AssignOption[];
  /** The maintenance manager plans for their own department. */
  fixedDepartmentId: string | null;
  /** Today in the factory time zone, the default first date. */
  today: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    savePmPlanAction,
    null,
  );
  const [departmentId, setDepartmentId] = useState(
    fixedDepartmentId ?? defaults?.departmentId ?? "",
  );
  const error = (name: string) => firstFieldError(state, name);

  return (
    <ActionForm action={formAction} noValidate>
      {defaults ? (
        <input type="hidden" name="planId" value={defaults.id} />
      ) : null}
      <FieldGroup>
        {defaults ? (
          <p className="text-sm">
            <span className="text-muted-foreground">الآلة: </span>
            {defaults.machineName}
          </p>
        ) : (
          <Field data-invalid={Boolean(error("machineId"))}>
            <FieldLabel htmlFor="pm-machine">الآلة</FieldLabel>
            <NativeSelect
              id="pm-machine"
              name="machineId"
              className="w-full"
              defaultValue={defaultMachineId ?? ""}
            >
              <NativeSelectOption value="">اختر الآلة</NativeSelectOption>
              {machines.map((machine) => (
                <NativeSelectOption key={machine.id} value={machine.id}>
                  {machine.code} · {machine.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError>{error("machineId")}</FieldError>
          </Field>
        )}

        <Field data-invalid={Boolean(error("title"))}>
          <FieldLabel htmlFor="pm-title">عنوان الخطة</FieldLabel>
          <Input
            id="pm-title"
            name="title"
            defaultValue={defaults?.title}
            placeholder="مثلاً: تغيير زيت المكبس"
            required
            maxLength={200}
          />
          <FieldError>{error("title")}</FieldError>
        </Field>

        <Field data-invalid={Boolean(error("instructions"))}>
          <FieldLabel htmlFor="pm-instructions">
            التعليمات للفني (اختياري)
          </FieldLabel>
          <Textarea
            id="pm-instructions"
            name="instructions"
            rows={3}
            defaultValue={defaults?.instructions ?? ""}
          />
          <FieldError>{error("instructions")}</FieldError>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(error("intervalCount"))}>
            <FieldLabel htmlFor="pm-count">التكرار كل</FieldLabel>
            <Input
              id="pm-count"
              name="intervalCount"
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              defaultValue={defaults?.intervalCount ?? 1}
              dir="ltr"
              className="text-start"
              required
            />
            <FieldError>{error("intervalCount")}</FieldError>
          </Field>
          <Field data-invalid={Boolean(error("intervalUnit"))}>
            <FieldLabel htmlFor="pm-unit">الوحدة</FieldLabel>
            <NativeSelect
              id="pm-unit"
              name="intervalUnit"
              className="w-full"
              defaultValue={defaults?.intervalUnit ?? "month"}
            >
              {INTERVAL_UNITS.map((unit) => (
                <NativeSelectOption key={unit} value={unit}>
                  {INTERVAL_UNIT_LABELS[unit]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError>{error("intervalUnit")}</FieldError>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(error("startDate"))}>
            <FieldLabel htmlFor="pm-start">تاريخ أول موعد</FieldLabel>
            <Input
              id="pm-start"
              name="startDate"
              type="date"
              defaultValue={defaults?.startDate ?? today}
              dir="ltr"
              className="text-start"
              required
            />
            <FieldError>{error("startDate")}</FieldError>
          </Field>
          <Field data-invalid={Boolean(error("leadDays"))}>
            <FieldLabel htmlFor="pm-lead">
              إنشاء المهمة قبل موعدها بـ (أيام)
            </FieldLabel>
            <Input
              id="pm-lead"
              name="leadDays"
              type="number"
              inputMode="numeric"
              min={0}
              max={60}
              defaultValue={defaults?.leadDays ?? 0}
              dir="ltr"
              className="text-start"
            />
            <FieldError>{error("leadDays")}</FieldError>
          </Field>
        </div>
        <FieldDescription>
          المواعيد تُحسب من تاريخ أول موعد ولا تتأثر بموعد إنجاز المرة السابقة.
          صفر يعني أن المهمة تُنشأ في يوم موعدها.
        </FieldDescription>

        {fixedDepartmentId ? null : (
          <Field>
            <FieldLabel htmlFor="pm-department">قسم المسند إليه</FieldLabel>
            <NativeSelect
              id="pm-department"
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
          </Field>
        )}
        {departmentId ? (
          <AssignmentFields
            key={departmentId}
            departmentId={departmentId}
            people={people}
            teams={teams}
            defaultMode={defaults?.assigneeTeamId ? "team" : "person"}
            defaultAssigneeId={defaults?.assigneeUserId}
            defaultTeamId={defaults?.assigneeTeamId}
            errors={{
              assigneeId: error("assigneeId"),
              teamId: error("teamId"),
            }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            اختر القسم لتظهر قائمة الموظفين والفرق.
          </p>
        )}

        <FormMessage state={state} />
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null}
            {defaults ? "حفظ التعديلات" : "إضافة الخطة"}
          </Button>
        </div>
      </FieldGroup>
    </ActionForm>
  );
}

export function PmPlanActiveForm({
  planId,
  isActive,
}: {
  planId: string;
  isActive: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    setPmPlanActiveAction,
    null,
  );
  return (
    <ActionForm action={formAction} className="space-y-3">
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="active" value={isActive ? "false" : "true"} />
      <p className="text-sm text-muted-foreground">
        {isActive
          ? "الخطة فعّالة، وتُنشأ مهامها في مواعيدها."
          : "الخطة موقوفة، ولا تُنشأ لها مهام."}
      </p>
      <Button
        type="submit"
        variant={isActive ? "outline" : "default"}
        disabled={pending}
      >
        {pending ? <Spinner /> : null}
        {isActive ? "إيقاف الخطة" : "تفعيل الخطة"}
      </Button>
      <FormMessage state={state} />
    </ActionForm>
  );
}

export function RunPmNowForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    runPmGenerationAction,
    null,
  );
  return (
    <ActionForm action={formAction} className="space-y-3">
      <p className="text-sm text-muted-foreground">
        الجدولة تعمل كل ساعة. هذا الزر ينشئ المهام المستحقة فوراً لتجربة الخطط،
        وهو غير متاح في بيئة الإنتاج.
      </p>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? <Spinner /> : null}
        تشغيل الآن
      </Button>
      <FormMessage state={state} />
    </ActionForm>
  );
}
