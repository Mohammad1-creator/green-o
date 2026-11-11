"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { type ActionState, formFields } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/dal";
import { APP_ROLES, isTopRole } from "@/lib/auth/roles";
import { toUserMessage } from "@/lib/errors";
import { optionalUuid } from "@/lib/form-schemas";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  userId: z.uuid(),
  role: z.enum(APP_ROLES, "اختر الدور"),
  departmentId: optionalUuid,
});

/** Changes one person's role. The database checks who may do it. */
export async function setUserRoleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await getCurrentUser();
  if (!viewer) {
    return { ok: false, message: "انتهت الجلسة. سجّل الدخول مرة أخرى." };
  }
  if (!isTopRole(viewer.role)) {
    return { ok: false, message: "تغيير الصلاحيات للمدير العام والمبرمج فقط" };
  }
  const parsed = schema.safeParse(formFields(formData));
  if (!parsed.success) return { ok: false, message: "طلب غير صالح" };

  const { userId, role, departmentId } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_role", {
    p_user_id: userId,
    p_role: role,
    p_department_id: isTopRole(role) ? undefined : (departmentId ?? undefined),
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  revalidatePath("/admin/permissions");
  revalidatePath("/admin/users");
  return { ok: true, message: "حُفظت الصلاحية" };
}
