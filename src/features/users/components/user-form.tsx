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
  APP_ROLES,
  type AppRole,
  ROLE_LABELS,
  isTopRole,
} from "@/lib/auth/roles";
import { suggestPassword } from "@/lib/auth/suggest-password";

import { createUserAction, updateUserAction } from "../actions";

type Department = { id: string; name: string };

export type UserFormValues = {
  userId?: string;
  fullName: string;
  employeeNo: string;
  role: AppRole;
  departmentId: string | null;
  phone: string | null;
  jobTitle: string | null;
  notes: string | null;
};

export function UserForm({
  mode,
  viewerRole,
  viewerDepartmentName,
  departments,
  defaults,
  lockRoleAndDepartment = false,
}: {
  mode: "create" | "edit";
  viewerRole: AppRole;
  viewerDepartmentName: string | null;
  departments: Department[];
  defaults?: UserFormValues;
  /** Nobody changes their own role or department. */
  lockRoleAndDepartment?: boolean;
}) {
  const action = mode === "create" ? createUserAction : updateUserAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    null,
  );
  const isGm = isTopRole(viewerRole);
  const [role, setRole] = useState<AppRole>(defaults?.role ?? "employee");
  const [password, setPassword] = useState("");
  const canChooseRole = isGm && !lockRoleAndDepartment;
  const needsDepartment = !isTopRole(role);

  return (
    <ActionForm action={formAction} noValidate>
      {defaults?.userId ? (
        <input type="hidden" name="userId" value={defaults.userId} />
      ) : null}
      <FieldGroup>
        <Field data-invalid={Boolean(firstFieldError(state, "fullName"))}>
          <FieldLabel htmlFor="fullName">الاسم الكامل</FieldLabel>
          <Input
            id="fullName"
            name="fullName"
            defaultValue={defaults?.fullName}
            required
          />
          <FieldError>{firstFieldError(state, "fullName")}</FieldError>
        </Field>

        <Field data-invalid={Boolean(firstFieldError(state, "employeeNo"))}>
          <FieldLabel htmlFor="employeeNo">رقم الموظف</FieldLabel>
          <Input
            id="employeeNo"
            name="employeeNo"
            inputMode="numeric"
            dir="ltr"
            className="text-start"
            defaultValue={defaults?.employeeNo}
            required
          />
          <FieldDescription>يُستخدم لتسجيل الدخول.</FieldDescription>
          <FieldError>{firstFieldError(state, "employeeNo")}</FieldError>
        </Field>

        {mode === "create" ? (
          <Field data-invalid={Boolean(firstFieldError(state, "password"))}>
            <FieldLabel htmlFor="password">كلمة المرور</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="password"
                name="password"
                dir="ltr"
                className="text-start"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setPassword(suggestPassword())}
              >
                اقتراح
              </Button>
            </div>
            <FieldDescription>
              8 خانات على الأقل. أبلغ الموظف بها بنفسك.
            </FieldDescription>
            <FieldError>{firstFieldError(state, "password")}</FieldError>
          </Field>
        ) : null}

        <Field data-invalid={Boolean(firstFieldError(state, "role"))}>
          <FieldLabel htmlFor="role">الدور</FieldLabel>
          {canChooseRole ? (
            <NativeSelect
              id="role"
              name="role"
              value={role}
              onChange={(event) => setRole(event.target.value as AppRole)}
              className="w-full"
            >
              {APP_ROLES.map((value) => (
                <NativeSelectOption key={value} value={value}>
                  {ROLE_LABELS[value]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          ) : (
            <>
              <input type="hidden" name="role" value={role} />
              <Input id="role" value={ROLE_LABELS[role]} disabled />
            </>
          )}
          <FieldError>{firstFieldError(state, "role")}</FieldError>
        </Field>

        {needsDepartment ? (
          <Field data-invalid={Boolean(firstFieldError(state, "departmentId"))}>
            <FieldLabel htmlFor="departmentId">القسم</FieldLabel>
            {isGm && !lockRoleAndDepartment ? (
              <NativeSelect
                id="departmentId"
                name="departmentId"
                defaultValue={defaults?.departmentId ?? ""}
                className="w-full"
              >
                <NativeSelectOption value="">اختر القسم</NativeSelectOption>
                {departments.map((department) => (
                  <NativeSelectOption key={department.id} value={department.id}>
                    {department.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            ) : (
              <>
                <input
                  type="hidden"
                  name="departmentId"
                  value={defaults?.departmentId ?? ""}
                />
                <Input
                  id="departmentId"
                  value={
                    departments.find((d) => d.id === defaults?.departmentId)
                      ?.name ??
                    viewerDepartmentName ??
                    ""
                  }
                  disabled
                />
              </>
            )}
            <FieldError>{firstFieldError(state, "departmentId")}</FieldError>
          </Field>
        ) : null}

        <Field data-invalid={Boolean(firstFieldError(state, "phone"))}>
          <FieldLabel htmlFor="phone">الهاتف (اختياري)</FieldLabel>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            dir="ltr"
            className="text-start"
            defaultValue={defaults?.phone ?? ""}
          />
          <FieldError>{firstFieldError(state, "phone")}</FieldError>
        </Field>

        <Field data-invalid={Boolean(firstFieldError(state, "jobTitle"))}>
          <FieldLabel htmlFor="jobTitle">المسمى الوظيفي (اختياري)</FieldLabel>
          <Input
            id="jobTitle"
            name="jobTitle"
            defaultValue={defaults?.jobTitle ?? ""}
          />
          <FieldError>{firstFieldError(state, "jobTitle")}</FieldError>
        </Field>

        {mode === "edit" ? (
          <Field data-invalid={Boolean(firstFieldError(state, "notes"))}>
            <FieldLabel htmlFor="notes">ملاحظات (اختياري)</FieldLabel>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={defaults?.notes ?? ""}
              rows={3}
            />
            <FieldError>{firstFieldError(state, "notes")}</FieldError>
          </Field>
        ) : null}

        <FormMessage state={state} />

        <div>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null}
            {mode === "create" ? "إنشاء الحساب" : "حفظ التغييرات"}
          </Button>
        </div>
      </FieldGroup>
    </ActionForm>
  );
}
