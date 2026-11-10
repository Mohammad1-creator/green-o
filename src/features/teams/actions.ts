"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { type ActionState, formFields } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/dal";
import { isManagerRole } from "@/lib/auth/roles";
import { toUserMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

const NOT_ALLOWED: ActionState = {
  ok: false,
  message: "ليست لديك صلاحية لهذا الإجراء",
};

const name = z
  .string()
  .optional()
  .transform((value) => (value ?? "").trim())
  .pipe(z.string().min(1, "اكتب اسم الفريق").max(100, "الاسم طويل جداً"));

const createSchema = z.object({ name, departmentId: z.uuid("اختر القسم") });
const updateSchema = z.object({
  teamId: z.uuid(),
  name,
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
});

async function currentManager() {
  const user = await getCurrentUser();
  return user && isManagerRole(user.role) ? user : null;
}

export async function createTeamAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await currentManager();
  if (!viewer) return NOT_ALLOWED;
  const fields = formFields(formData);
  const parsed = createSchema.safeParse({
    ...fields,
    departmentId:
      viewer.role === "general_manager"
        ? fields.departmentId
        : viewer.departmentId,
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: "تحقق من الحقول",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("teams").insert({
    name: parsed.data.name,
    department_id: parsed.data.departmentId,
  });
  if (error) {
    return error.code === "23505"
      ? { ok: false, message: "يوجد فريق بهذا الاسم في القسم" }
      : { ok: false, message: toUserMessage(error) };
  }
  revalidatePath("/admin/teams");
  return { ok: true, message: "أُنشئ الفريق" };
}

export async function updateTeamAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await currentManager())) return NOT_ALLOWED;
  const parsed = updateSchema.safeParse(formFields(formData));
  if (!parsed.success) return { ok: false, message: "تحقق من الحقول" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({ name: parsed.data.name, is_active: parsed.data.active })
    .eq("id", parsed.data.teamId);
  if (error) {
    return error.code === "23505"
      ? { ok: false, message: "يوجد فريق بهذا الاسم في القسم" }
      : { ok: false, message: toUserMessage(error) };
  }
  revalidatePath("/admin/teams");
  return { ok: true, message: "حُفظ الفريق" };
}

/** Replaces the member list with the checked people. */
export async function setTeamMembersAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await currentManager())) return NOT_ALLOWED;
  const teamId = z.uuid().safeParse(formData.get("teamId"));
  const members = z
    .array(z.uuid())
    .max(500)
    .safeParse(formData.getAll("members"));
  if (!teamId.success || !members.success)
    return { ok: false, message: "طلب غير صالح" };

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("team_id", teamId.data);
  if (readError) return { ok: false, message: toUserMessage(readError) };

  const wanted = new Set(members.data);
  const existing = new Set(current.map((row) => row.user_id));
  const toRemove = [...existing].filter((id) => !wanted.has(id));
  const toAdd = [...wanted].filter((id) => !existing.has(id));

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", teamId.data)
      .in("user_id", toRemove);
    if (error) return { ok: false, message: toUserMessage(error) };
  }
  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("team_members")
      .insert(
        toAdd.map((userId) => ({ team_id: teamId.data, user_id: userId })),
      );
    if (error) return { ok: false, message: toUserMessage(error) };
  }

  revalidatePath("/admin/teams");
  return { ok: true, message: "حُفظ الأعضاء" };
}
