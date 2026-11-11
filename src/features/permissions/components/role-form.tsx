"use client";

import { useActionState, useState } from "react";

import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { type ActionState } from "@/lib/action-state";
import {
  APP_ROLES,
  type AppRole,
  isTopRole,
  ROLE_LABELS,
} from "@/lib/auth/roles";

import { setUserRoleAction } from "../actions";

export function RoleForm({
  userId,
  userName,
  role: currentRole,
  departmentId,
  departments,
}: {
  userId: string;
  userName: string;
  role: AppRole;
  departmentId: string | null;
  departments: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    setUserRoleAction,
    null,
  );
  const [role, setRole] = useState<AppRole>(currentRole);
  const [department, setDepartment] = useState(departmentId ?? "");
  const changed =
    role !== currentRole ||
    (!isTopRole(role) && department !== (departmentId ?? ""));

  return (
    <ActionForm
      action={formAction}
      className="flex flex-wrap items-center gap-2"
      confirm={
        isTopRole(role) && role !== currentRole
          ? `منح «${userName}» صلاحية ${ROLE_LABELS[role]}؟ سيرى ويعدّل كل شيء في النظام.`
          : undefined
      }
    >
      <input type="hidden" name="userId" value={userId} />
      <NativeSelect
        name="role"
        aria-label={`دور ${userName}`}
        value={role}
        onChange={(event) => setRole(event.target.value as AppRole)}
      >
        {APP_ROLES.map((value) => (
          <NativeSelectOption key={value} value={value}>
            {ROLE_LABELS[value]}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {isTopRole(role) ? null : (
        <NativeSelect
          name="departmentId"
          aria-label={`قسم ${userName}`}
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
        >
          <NativeSelectOption value="">اختر القسم</NativeSelectOption>
          {departments.map((item) => (
            <NativeSelectOption key={item.id} value={item.id}>
              {item.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      )}
      <Button
        type="submit"
        size="sm"
        variant={changed ? "default" : "outline"}
        disabled={pending || !changed}
      >
        حفظ
      </Button>
      {state?.message ? (
        <span
          role={state.ok ? "status" : "alert"}
          className={
            state.ok
              ? "text-sm text-muted-foreground"
              : "text-sm text-destructive"
          }
        >
          {state.message}
        </span>
      ) : null}
    </ActionForm>
  );
}
