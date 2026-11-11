"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { type ActionState, formFields } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/dal";
import { toUserMessage } from "@/lib/errors";
import { formText } from "@/lib/form-schemas";
import { createClient } from "@/lib/supabase/server";

import { parseAwards } from "./schemas";

const SIGNED_OUT: ActionState = {
  ok: false,
  message: "انتهت الجلسة. سجّل الدخول مرة أخرى.",
};

function refresh(taskId: string) {
  revalidatePath(`/admin/tasks/${taskId}`);
  revalidatePath("/admin/points");
}

export async function awardPointsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = parseAwards(formFields(formData));
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const { error } = await supabase.rpc("award_task_points", {
    p_task_id: parsed.taskId,
    p_user_ids: parsed.awards.map((award) => award.userId),
    p_points: parsed.awards.map((award) => award.points),
    p_note: parsed.note ?? undefined,
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  refresh(parsed.taskId);
  return { ok: true, message: "أُضيفت النقاط" };
}

const voidSchema = z.object({
  taskId: z.uuid(),
  pointsId: z.uuid(),
  reason: formText.pipe(
    z.string().min(3, "اكتب سبب الإلغاء").max(500, "السبب طويل"),
  ),
});

export async function voidPointsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = voidSchema.safeParse(formFields(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "اكتب سبب الإلغاء",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("void_task_points", {
    p_id: parsed.data.pointsId,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  refresh(parsed.data.taskId);
  return { ok: true, message: "أُلغيت النقاط" };
}
