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
import { Spinner } from "@/components/ui/spinner";
import { ActionForm } from "@/components/action-form";
import { type ActionState, firstFieldError } from "@/lib/action-state";

import { updateSettingsAction } from "../actions";

const COMMON_ZONES = [
  "Asia/Riyadh",
  "Asia/Baghdad",
  "Asia/Kuwait",
  "Asia/Qatar",
  "Asia/Bahrain",
  "Asia/Dubai",
  "Asia/Muscat",
  "Asia/Amman",
  "Asia/Damascus",
  "Asia/Beirut",
  "Africa/Cairo",
];

export function SettingsForm({
  factoryName,
  timeZone,
}: {
  factoryName: string;
  timeZone: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateSettingsAction,
    null,
  );

  return (
    <ActionForm action={formAction} noValidate>
      <FieldGroup>
        <Field data-invalid={Boolean(firstFieldError(state, "factoryName"))}>
          <FieldLabel htmlFor="factoryName">اسم المصنع</FieldLabel>
          <Input
            id="factoryName"
            name="factoryName"
            defaultValue={factoryName}
            required
          />
          <FieldError>{firstFieldError(state, "factoryName")}</FieldError>
        </Field>

        <Field data-invalid={Boolean(firstFieldError(state, "timeZone"))}>
          <FieldLabel htmlFor="timeZone">المنطقة الزمنية</FieldLabel>
          <Input
            id="timeZone"
            name="timeZone"
            list="time-zones"
            dir="ltr"
            className="text-start"
            defaultValue={timeZone}
            required
          />
          <datalist id="time-zones">
            {COMMON_ZONES.map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
          <FieldDescription>
            تحدد بداية اليوم ونهايته في المهام المتأخرة والصيانة الدورية
            والتقارير.
          </FieldDescription>
          <FieldError>{firstFieldError(state, "timeZone")}</FieldError>
        </Field>

        <FormMessage state={state} />
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null}
            حفظ الإعدادات
          </Button>
        </div>
      </FieldGroup>
    </ActionForm>
  );
}
