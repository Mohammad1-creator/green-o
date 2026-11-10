"use client";

import type { AuthError } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { safeNextPath } from "@/lib/auth/roles";
import {
  employeeNumberToEmail,
  isValidEmployeeNumber,
} from "@/lib/auth/staff-email";
import { createClient } from "@/lib/supabase/browser";

const INACTIVE_MESSAGE = "هذا الحساب موقوف. راجع مديرك.";

function loginErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "رقم الموظف أو كلمة المرور غير صحيحة";
    case "user_banned":
      return INACTIVE_MESSAGE;
    case "over_request_rate_limit":
      return "محاولات كثيرة. انتظر بضع دقائق ثم حاول مرة أخرى.";
    default:
      return error.status === 429
        ? "محاولات كثيرة. انتظر بضع دقائق ثم حاول مرة أخرى."
        : "تعذّر تسجيل الدخول. تحقق من الاتصال وحاول مرة أخرى.";
  }
}

/**
 * Signs in from the browser, straight to Supabase Auth, so the per-IP login
 * limit counts real visitors instead of the app server.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(
    searchParams.get("reason") === "inactive" ? INACTIVE_MESSAGE : null,
  );
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const employeeNo = String(form.get("employeeNo") ?? "");
    const password = String(form.get("password") ?? "");

    if (!isValidEmployeeNumber(employeeNo)) {
      setError("أدخل رقم الموظف بالأرقام فقط");
      return;
    }
    if (!password) {
      setError("أدخل كلمة المرور");
      return;
    }

    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: employeeNumberToEmail(employeeNo),
        password,
      });
      if (signInError) {
        setError(loginErrorMessage(signInError));
        return;
      }
      router.replace(safeNextPath(searchParams.get("next")) ?? "/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="employeeNo">رقم الموظف</FieldLabel>
          <Input
            id="employeeNo"
            name="employeeNo"
            inputMode="numeric"
            autoComplete="username"
            dir="ltr"
            className="text-start"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">كلمة المرور</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            dir="ltr"
            className="text-start"
            required
          />
        </Field>

        {error ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Spinner /> : null}
          دخول
        </Button>
      </FieldGroup>
    </form>
  );
}
