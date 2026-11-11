"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { type ActionState, formFields } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/dal";
import { toUserMessage } from "@/lib/errors";
import { isValidTimeZone } from "@/lib/format";
import { SETTINGS_CACHE_TAG } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { isTopRole } from "@/lib/auth/roles";

const settingsSchema = z.object({
  factoryName: z
    .string()
    .optional()
    .transform((value) => (value ?? "").trim())
    .pipe(z.string().min(1, "اكتب اسم المصنع").max(100, "الاسم طويل جداً")),
  timeZone: z
    .string()
    .optional()
    .transform((value) => (value ?? "").trim())
    .refine(isValidTimeZone, "المنطقة الزمنية غير معروفة"),
});

export async function updateSettingsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!isTopRole(user?.role)) {
    return { ok: false, message: "ليست لديك صلاحية لهذا الإجراء" };
  }

  const parsed = settingsSchema.safeParse(formFields(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "تحقق من الحقول",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({
      factory_name: parsed.data.factoryName,
      timezone: parsed.data.timeZone,
    })
    .eq("id", true);
  if (error) return { ok: false, message: toUserMessage(error) };

  updateTag(SETTINGS_CACHE_TAG);
  return { ok: true, message: "حُفظت الإعدادات" };
}
