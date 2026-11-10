"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { assignmentSchema } from "@/features/tasks/schemas";
import { type ActionState, formFields } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/dal";
import { toWesternDigits } from "@/lib/digits";
import { toUserMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

const SIGNED_OUT: ActionState = {
  ok: false,
  message: "انتهت الجلسة. سجّل الدخول مرة أخرى.",
};
const INVALID = "تحقق من الحقول المحددة";
const PATH = "/admin/maintenance/preventive";

const text = z
  .string()
  .optional()
  .transform((value) => toWesternDigits(value ?? "").trim());
const optionalUuid = text
  .transform((value) => value || null)
  .pipe(z.uuid().nullable());
/** Digits only, read as a whole number between min and max. */
const wholeNumber = (min: number, max: number) => {
  const message = `اكتب رقماً من ${min} إلى ${max}`;
  return z
    .string()
    .regex(/^\d+$/, message)
    .transform(Number)
    .pipe(z.number().int(message).min(min, message).max(max, message));
};

const planSchema = z
  .object({
    planId: optionalUuid,
    machineId: optionalUuid,
    title: text.pipe(
      z.string().min(1, "اكتب عنوان الخطة").max(200, "العنوان طويل جداً"),
    ),
    instructions: text.pipe(z.string().max(5000, "التعليمات طويلة جداً")),
    intervalUnit: z.enum(["day", "week", "month"], "اختر وحدة التكرار"),
    intervalCount: text.pipe(wholeNumber(1, 365)),
    startDate: text.pipe(
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "اختر تاريخ أول موعد"),
    ),
    leadDays: text.transform((value) => value || "0").pipe(wholeNumber(0, 60)),
  })
  .and(assignmentSchema)
  .superRefine((value, ctx) => {
    if (!value.planId && !value.machineId) {
      ctx.addIssue({
        code: "custom",
        path: ["machineId"],
        message: "اختر الآلة",
      });
    }
  });

export async function savePmPlanAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = planSchema.safeParse(formFields(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: INVALID,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const input = parsed.data;
  const schedule = {
    p_title: input.title,
    p_instructions: input.instructions,
    p_interval_unit: input.intervalUnit,
    p_interval_count: input.intervalCount,
    p_start_date: input.startDate,
    p_lead_days: input.leadDays,
    p_assignee_user_id:
      input.assignMode === "person"
        ? (input.assigneeId ?? undefined)
        : undefined,
    p_team_id:
      input.assignMode === "team" ? (input.teamId ?? undefined) : undefined,
  };

  const supabase = await createClient();
  if (input.planId) {
    const { error } = await supabase.rpc("update_pm_plan", {
      p_plan_id: input.planId,
      ...schedule,
    });
    if (error) return { ok: false, message: toUserMessage(error) };
    revalidatePath(PATH);
    revalidatePath(`${PATH}/${input.planId}`);
    return { ok: true, message: "حُفظت الخطة" };
  }

  const { data: planId, error } = await supabase.rpc("create_pm_plan", {
    p_machine_id: input.machineId ?? "",
    ...schedule,
  });
  if (error || !planId) return { ok: false, message: toUserMessage(error) };
  revalidatePath(PATH);
  redirect(`${PATH}/${planId}?created=1`);
}

const activeSchema = z.object({
  planId: z.uuid(),
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export async function setPmPlanActiveAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = activeSchema.safeParse(formFields(formData));
  if (!parsed.success) return { ok: false, message: INVALID };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_pm_plan_active", {
    p_plan_id: parsed.data.planId,
    p_active: parsed.data.active,
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  revalidatePath(PATH);
  revalidatePath(`${PATH}/${parsed.data.planId}`);
  return {
    ok: true,
    message: parsed.data.active
      ? "فُعّلت الخطة، وستُنشأ مهامها في مواعيدها"
      : "أُوقفت الخطة، ولن تُنشأ لها مهام جديدة",
  };
}

function createdMessage(count: number): string {
  if (count === 0) return "لا توجد مواعيد مستحقة الآن";
  if (count === 1) return "أُنشئت مهمة واحدة";
  if (count === 2) return "أُنشئت مهمتان";
  return `أُنشئت ${count} ${count <= 10 ? "مهام" : "مهمة"}`;
}

/** Runs the hourly generation at once. The database refuses it in production. */
export async function runPmGenerationAction(): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("run_pm_generation_now");
  if (error) return { ok: false, message: toUserMessage(error) };
  revalidatePath(PATH, "layout");
  revalidatePath("/admin/tasks");
  return { ok: true, message: createdMessage(data ?? 0) };
}
