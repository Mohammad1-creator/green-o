"use client";

import { useActionState, useState } from "react";

import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ActionForm } from "@/components/action-form";
import { type ActionState, firstFieldError } from "@/lib/action-state";
import { suggestPassword } from "@/lib/auth/suggest-password";

import { resetPasswordAction, setUserActiveAction } from "../actions";

export function UserStatusForm({
  userId,
  isActive,
}: {
  userId: string;
  isActive: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    setUserActiveAction,
    null,
  );

  return (
    <ActionForm
      action={formAction}
      className="space-y-3"
      confirm={
        isActive
          ? "إيقاف الحساب يمنع صاحبه من الدخول فوراً. متابعة؟"
          : undefined
      }
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="active" value={isActive ? "false" : "true"} />
      <p className="text-sm text-muted-foreground">
        {isActive
          ? "الحساب نشط ويستطيع صاحبه الدخول."
          : "الحساب موقوف ولا يستطيع صاحبه الدخول."}
      </p>
      <FormMessage state={state} />
      <Button
        type="submit"
        variant={isActive ? "destructive" : "default"}
        disabled={pending}
      >
        {pending ? <Spinner /> : null}
        {isActive ? "إيقاف الحساب" : "تفعيل الحساب"}
      </Button>
    </ActionForm>
  );
}

export function PasswordResetForm({
  userId,
  employeeNo,
}: {
  userId: string;
  employeeNo: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    resetPasswordAction,
    null,
  );
  const [password, setPassword] = useState("");

  return (
    <ActionForm action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="employeeNo" value={employeeNo} />
      <Field data-invalid={Boolean(firstFieldError(state, "password"))}>
        <FieldLabel htmlFor="new-password">كلمة مرور جديدة</FieldLabel>
        <div className="flex gap-2">
          <Input
            id="new-password"
            name="password"
            dir="ltr"
            className="text-start"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setPassword(suggestPassword())}
          >
            اقتراح
          </Button>
        </div>
        <FieldError>{firstFieldError(state, "password")}</FieldError>
      </Field>
      <FormMessage state={state} />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? <Spinner /> : null}
        تغيير كلمة المرور
      </Button>
    </ActionForm>
  );
}
