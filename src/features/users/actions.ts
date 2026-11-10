"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { type ActionState, formFields } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/dal";
import { isManagerRole } from "@/lib/auth/roles";
import { employeeNumberToEmail } from "@/lib/auth/staff-email";
import { toUserMessage } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import {
  createUserSchema,
  resetPasswordSchema,
  setUserActiveSchema,
  updateUserSchema,
} from "./schemas";

const NOT_ALLOWED: ActionState = {
  ok: false,
  message: "ليست لديك صلاحية لهذا الإجراء",
};
const INVALID = "تحقق من الحقول المحددة";
// Long enough to mean "until reactivated".
const BLOCKED = "876000h";

async function currentManager() {
  const user = await getCurrentUser();
  return user && isManagerRole(user.role) ? user : null;
}

export async function createUserAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await currentManager();
  if (!viewer) return NOT_ALLOWED;

  const parsed = createUserSchema.safeParse(formFields(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: INVALID,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const input = parsed.data;

  // A department manager always creates staff in their own department.
  const departmentId =
    input.role === "general_manager"
      ? null
      : viewer.role === "general_manager"
        ? input.departmentId
        : viewer.departmentId;

  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("can_manage_account", {
    p_department_id: departmentId as string,
    p_role: input.role,
  });
  if (!allowed)
    return { ok: false, message: "ليست لديك صلاحية لإنشاء هذا الحساب" };

  const admin = createAdminClient();
  const { data: created, error: authError } = await admin.auth.admin.createUser(
    {
      email: employeeNumberToEmail(input.employeeNo),
      password: input.password,
      email_confirm: true,
    },
  );
  if (authError || !created.user) {
    if (authError?.code === "email_exists") {
      return {
        ok: false,
        message: INVALID,
        fieldErrors: { employeeNo: ["رقم الموظف مستخدم لحساب آخر"] },
      };
    }
    if (authError?.code === "weak_password") {
      return {
        ok: false,
        message: INVALID,
        fieldErrors: { password: ["كلمة المرور ضعيفة"] },
      };
    }
    return { ok: false, message: "تعذّر إنشاء حساب الدخول. حاول مرة أخرى." };
  }

  const { error: profileError } = await supabase.rpc("create_user_profile", {
    p_user_id: created.user.id,
    p_full_name: input.fullName,
    p_role: input.role,
    p_department_id: departmentId as string,
    p_employee_no: input.employeeNo,
    p_phone: input.phone ?? undefined,
    p_job_title: input.jobTitle ?? undefined,
  });
  if (profileError) {
    // Undo the login account so no half-created user is left behind.
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, message: toUserMessage(profileError) };
  }

  revalidatePath("/admin/users");
  redirect(`/admin/users/${created.user.id}?created=1`);
}

export async function updateUserAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await currentManager();
  if (!viewer) return NOT_ALLOWED;

  const parsed = updateUserSchema.safeParse(formFields(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: INVALID,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const input = parsed.data;
  const departmentId =
    input.role === "general_manager"
      ? null
      : viewer.role === "general_manager"
        ? input.departmentId
        : viewer.departmentId;

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("employee_details")
    .select("employee_no")
    .eq("user_id", input.userId)
    .maybeSingle();
  if (!before) return NOT_ALLOWED;

  const params = {
    p_user_id: input.userId,
    p_full_name: input.fullName,
    p_role: input.role,
    p_department_id: departmentId as string,
    p_employee_no: input.employeeNo,
    p_phone: input.phone ?? undefined,
    p_job_title: input.jobTitle ?? undefined,
    p_notes: input.notes ?? undefined,
  };
  const { error } = await supabase.rpc("update_user_profile", params);
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        message: INVALID,
        fieldErrors: { employeeNo: ["رقم الموظف مستخدم لحساب آخر"] },
      };
    }
    return { ok: false, message: toUserMessage(error) };
  }

  // The login address follows the employee number.
  if (before.employee_no !== input.employeeNo) {
    const { error: authError } =
      await createAdminClient().auth.admin.updateUserById(input.userId, {
        email: employeeNumberToEmail(input.employeeNo),
        email_confirm: true,
      });
    if (authError) {
      await supabase.rpc("update_user_profile", {
        ...params,
        p_employee_no: before.employee_no,
      });
      return {
        ok: false,
        message: "تعذّر تغيير رقم الموظف. لم يُحفظ أي تغيير على رقم الدخول.",
      };
    }
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${input.userId}`);
  return { ok: true, message: "حُفظت التغييرات" };
}

export async function setUserActiveAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await currentManager();
  if (!viewer) return NOT_ALLOWED;

  const parsed = setUserActiveSchema.safeParse(formFields(formData));
  if (!parsed.success) return { ok: false, message: INVALID };
  const { userId, active } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_active", {
    p_user_id: userId,
    p_active: active,
  });
  if (error) return { ok: false, message: toUserMessage(error) };

  // The database blocks the account at once; this also stops new sign-ins.
  await createAdminClient().auth.admin.updateUserById(userId, {
    ban_duration: active ? "none" : BLOCKED,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true, message: active ? "فُعّل الحساب" : "أُوقف الحساب" };
}

export async function resetPasswordAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await currentManager();
  if (!viewer) return NOT_ALLOWED;

  const parsed = resetPasswordSchema.safeParse(formFields(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: INVALID,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const { userId, password } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("authorize_password_reset", {
    p_user_id: userId,
  });
  if (error) return { ok: false, message: toUserMessage(error) };

  const { error: authError } =
    await createAdminClient().auth.admin.updateUserById(userId, {
      password,
    });
  if (authError) {
    return authError.code === "weak_password"
      ? {
          ok: false,
          message: INVALID,
          fieldErrors: { password: ["كلمة المرور ضعيفة"] },
        }
      : { ok: false, message: "تعذّر تغيير كلمة المرور. حاول مرة أخرى." };
  }

  return { ok: true, message: "تغيّرت كلمة المرور. أبلغ الموظف بها." };
}
