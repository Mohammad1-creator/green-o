"use client";

import { useActionState } from "react";

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
import {
  type AssignOption,
  AssignmentFields,
} from "@/features/tasks/components/assignment-fields";
import { type ActionState, firstFieldError } from "@/lib/action-state";

import {
  assignRepairAction,
  rejectFaultAction,
  reportFaultAction,
  saveMachineAction,
} from "../actions";
import {
  MACHINE_STATUS_LABELS,
  MACHINE_STATUSES,
  type MachineStatus,
} from "../labels";

export type MachineDefaults = {
  id?: string;
  code: string;
  name: string;
  departmentId: string | null;
  status: MachineStatus;
  manufacturer: string | null;
  model: string | null;
  serialNo: string | null;
  installedOn: string | null;
  notes: string | null;
};

function TextField({
  state,
  name,
  label,
  defaultValue,
  required = false,
  ltr = false,
  type = "text",
}: {
  state: ActionState;
  name: string;
  label: string;
  defaultValue?: string | null;
  required?: boolean;
  ltr?: boolean;
  type?: string;
}) {
  const error = firstFieldError(state, name);
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={`machine-${name}`}>{label}</FieldLabel>
      <Input
        id={`machine-${name}`}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        dir={ltr ? "ltr" : undefined}
        className={ltr ? "text-start" : undefined}
      />
      <FieldError>{error}</FieldError>
    </Field>
  );
}

export function MachineForm({
  defaults,
  departments,
}: {
  defaults?: MachineDefaults;
  departments: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveMachineAction,
    null,
  );
  return (
    <form action={formAction} noValidate>
      {defaults?.id ? (
        <input type="hidden" name="machineId" value={defaults.id} />
      ) : null}
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            state={state}
            name="code"
            label="الرمز"
            defaultValue={defaults?.code}
            required
            ltr
          />
          <TextField
            state={state}
            name="name"
            label="الاسم"
            defaultValue={defaults?.name}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="machine-department">
              القسم المستخدم لها (اختياري)
            </FieldLabel>
            <NativeSelect
              id="machine-department"
              name="departmentId"
              className="w-full"
              defaultValue={defaults?.departmentId ?? ""}
            >
              <NativeSelectOption value="">بلا قسم محدد</NativeSelectOption>
              {departments.map((department) => (
                <NativeSelectOption key={department.id} value={department.id}>
                  {department.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="machine-status">الحالة</FieldLabel>
            <NativeSelect
              id="machine-status"
              name="status"
              className="w-full"
              defaultValue={defaults?.status ?? "operational"}
            >
              {MACHINE_STATUSES.map((status) => (
                <NativeSelectOption key={status} value={status}>
                  {MACHINE_STATUS_LABELS[status]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            state={state}
            name="manufacturer"
            label="الصانع"
            defaultValue={defaults?.manufacturer}
          />
          <TextField
            state={state}
            name="model"
            label="الطراز"
            defaultValue={defaults?.model}
            ltr
          />
          <TextField
            state={state}
            name="serialNo"
            label="الرقم التسلسلي"
            defaultValue={defaults?.serialNo}
            ltr
          />
        </div>
        <TextField
          state={state}
          name="installedOn"
          label="تاريخ التركيب (اختياري)"
          defaultValue={defaults?.installedOn}
          type="date"
          ltr
        />
        <Field>
          <FieldLabel htmlFor="machine-notes">ملاحظات (اختياري)</FieldLabel>
          <Textarea
            id="machine-notes"
            name="notes"
            rows={3}
            defaultValue={defaults?.notes ?? ""}
          />
        </Field>
        <FormMessage state={state} />
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null}
            {defaults?.id ? "حفظ التعديلات" : "إضافة الآلة"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

export function FaultReportForm({
  machines,
  origin,
}: {
  machines: { id: string; code: string; name: string }[];
  origin: "m" | "admin";
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    reportFaultAction,
    null,
  );
  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="origin" value={origin} />
      <FieldGroup>
        <Field data-invalid={Boolean(firstFieldError(state, "machineId"))}>
          <FieldLabel htmlFor="fault-machine">الآلة</FieldLabel>
          <NativeSelect
            id="fault-machine"
            name="machineId"
            className="w-full"
            defaultValue=""
          >
            <NativeSelectOption value="">اختر الآلة</NativeSelectOption>
            {machines.map((machine) => (
              <NativeSelectOption key={machine.id} value={machine.id}>
                {machine.code} · {machine.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError>{firstFieldError(state, "machineId")}</FieldError>
        </Field>
        <Field data-invalid={Boolean(firstFieldError(state, "description"))}>
          <FieldLabel htmlFor="fault-description">ما المشكلة؟</FieldLabel>
          <Textarea
            id="fault-description"
            name="description"
            rows={4}
            placeholder="مثلاً: صوت طرق عالٍ عند التشغيل، أو تسرب زيت من المكبس"
            required
          />
          <FieldError>{firstFieldError(state, "description")}</FieldError>
        </Field>
        <label className="flex items-center gap-3 rounded-lg border p-3 text-sm font-medium">
          <input
            type="checkbox"
            name="stopped"
            className="size-5 accent-destructive"
          />
          الآلة متوقفة عن العمل بسبب هذا العطل
        </label>
        <FieldDescription>يمكنك إرفاق صور بعد إرسال البلاغ.</FieldDescription>
        <FormMessage state={state} />
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Spinner /> : null}
          إرسال البلاغ
        </Button>
      </FieldGroup>
    </form>
  );
}

export function AssignRepairForm({
  faultId,
  departmentId,
  people,
  teams,
  defaultTitle,
}: {
  faultId: string;
  departmentId: string;
  people: AssignOption[];
  teams: AssignOption[];
  defaultTitle: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    assignRepairAction,
    null,
  );
  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="faultId" value={faultId} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="repair-title">عنوان مهمة الإصلاح</FieldLabel>
          <Input id="repair-title" name="title" defaultValue={defaultTitle} />
        </Field>
        <Field>
          <FieldLabel htmlFor="repair-description">
            تعليمات للفني (اختياري)
          </FieldLabel>
          <Textarea id="repair-description" name="description" rows={3} />
        </Field>
        <Field data-invalid={Boolean(firstFieldError(state, "due"))}>
          <FieldLabel htmlFor="repair-due">موعد الإنجاز (اختياري)</FieldLabel>
          <Input
            id="repair-due"
            name="due"
            type="datetime-local"
            dir="ltr"
            className="text-start"
          />
          <FieldError>{firstFieldError(state, "due")}</FieldError>
        </Field>
        <AssignmentFields
          departmentId={departmentId}
          people={people}
          teams={teams}
          errors={{
            assigneeId: firstFieldError(state, "assigneeId"),
            teamId: firstFieldError(state, "teamId"),
          }}
        />
        <FormMessage state={state} />
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null}
            إسناد الإصلاح
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

export function RejectFaultForm({ faultId }: { faultId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    rejectFaultAction,
    null,
  );
  return (
    <form action={formAction} className="space-y-2" noValidate>
      <input type="hidden" name="faultId" value={faultId} />
      <Field data-invalid={Boolean(firstFieldError(state, "reason"))}>
        <FieldLabel htmlFor="reject-reason">سبب الرفض</FieldLabel>
        <Textarea id="reject-reason" name="reason" rows={2} required />
        <FieldError>{firstFieldError(state, "reason")}</FieldError>
      </Field>
      <Button type="submit" variant="destructive" disabled={pending}>
        رفض البلاغ
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
