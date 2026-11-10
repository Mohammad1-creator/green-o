"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { type ActionState, formFields } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/dal";
import { toUserMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

const name = z
  .string()
  .optional()
  .transform((value) => (value ?? "").trim())
  .pipe(z.string().min(1, "اكتب اسم القسم").max(100, "الاسم طويل جداً"));

const createSchema = z.object({ name });
const renameSchema = z.object({ departmentId: z.uuid(), name });
const activeSchema = z.object({
  departmentId: z.uuid(),
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
});

const NOT_ALLOWED: ActionState = {
  ok: false,
  message: "ليست لديك صلاحية لهذا الإجراء",
};

async function isGeneralManager() {
  const user = await getCurrentUser();
  return user?.role === "general_manager";
}

export async function createDepartmentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await isGeneralManager())) return NOT_ALLOWED;
  const parsed = createSchema.safeParse(formFields(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "تحقق من الاسم",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("departments")
    .insert({ name: parsed.data.name });
  if (error) {
    return error.code === "23505"
      ? { ok: false, message: "يوجد قسم بهذا الاسم" }
      : { ok: false, message: toUserMessage(error) };
  }

  revalidatePath("/admin/departments");
  return { ok: true, message: "أُضيف القسم" };
}

export async function renameDepartmentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await isGeneralManager())) return NOT_ALLOWED;
  const parsed = renameSchema.safeParse(formFields(formData));
  if (!parsed.success) return { ok: false, message: "تحقق من الاسم" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("departments")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.departmentId);
  if (error) {
    return error.code === "23505"
      ? { ok: false, message: "يوجد قسم بهذا الاسم" }
      : { ok: false, message: toUserMessage(error) };
  }

  revalidatePath("/admin/departments");
  return { ok: true, message: "حُفظ الاسم" };
}

export async function setDepartmentActiveAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await isGeneralManager())) return NOT_ALLOWED;
  const parsed = activeSchema.safeParse(formFields(formData));
  if (!parsed.success) return { ok: false, message: "طلب غير صالح" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("departments")
    .update({ is_active: parsed.data.active })
    .eq("id", parsed.data.departmentId);
  if (error) return { ok: false, message: toUserMessage(error) };

  revalidatePath("/admin/departments");
  return {
    ok: true,
    message: parsed.data.active ? "فُعّل القسم" : "أُوقف القسم",
  };
}
