"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { assignmentSchema, localDueSchema } from "@/features/tasks/schemas";
import { type ActionState, formFields } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/dal";
import { toUserMessage } from "@/lib/errors";
import { getFactorySettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { zonedLocalToDate } from "@/lib/zoned-time";

import { MACHINE_STATUSES } from "./labels";

const SIGNED_OUT: ActionState = {
  ok: false,
  message: "انتهت الجلسة. سجّل الدخول مرة أخرى.",
};
const INVALID = "تحقق من الحقول المحددة";

const text = z
  .string()
  .optional()
  .transform((value) => (value ?? "").trim());
const optionalText = (max: number) =>
  text
    .pipe(z.string().max(max, "النص طويل جداً"))
    .transform((value) => value || null);

const machineSchema = z.object({
  machineId: text.transform((value) => value || null).pipe(z.uuid().nullable()),
  code: text.pipe(
    z.string().min(1, "اكتب رمز الآلة").max(40, "الرمز طويل جداً"),
  ),
  name: text.pipe(
    z.string().min(1, "اكتب اسم الآلة").max(120, "الاسم طويل جداً"),
  ),
  departmentId: text
    .transform((value) => value || null)
    .pipe(z.uuid().nullable()),
  status: z
    .enum(MACHINE_STATUSES as [string, ...string[]])
    .default("operational"),
  manufacturer: optionalText(120),
  model: optionalText(120),
  serialNo: optionalText(120),
  installedOn: text
    .pipe(z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "تاريخ غير صالح"))
    .transform((value) => value || null),
  notes: optionalText(2000),
});

export async function saveMachineAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = machineSchema.safeParse(formFields(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: INVALID,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const input = parsed.data;
  const row = {
    code: input.code,
    name: input.name,
    department_id: input.departmentId,
    status: input.status as
      "operational" | "down" | "under_maintenance" | "retired",
    manufacturer: input.manufacturer,
    model: input.model,
    serial_no: input.serialNo,
    installed_on: input.installedOn,
    notes: input.notes,
  };

  const supabase = await createClient();
  const { data, error } = input.machineId
    ? await supabase
        .from("machines")
        .update(row)
        .eq("id", input.machineId)
        .select("id")
        .single()
    : await supabase.from("machines").insert(row).select("id").single();
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        message: INVALID,
        fieldErrors: { code: ["هذا الرمز مستخدم لآلة أخرى"] },
      };
    }
    return { ok: false, message: toUserMessage(error) };
  }

  revalidatePath("/admin/maintenance/machines");
  if (!input.machineId)
    redirect(`/admin/maintenance/machines/${data.id}?created=1`);
  revalidatePath(`/admin/maintenance/machines/${input.machineId}`);
  return { ok: true, message: "حُفظت بيانات الآلة" };
}

const reportSchema = z.object({
  machineId: z.uuid("اختر الآلة"),
  description: text.pipe(
    z.string().min(3, "صف العطل باختصار").max(2000, "الوصف طويل جداً"),
  ),
  stopped: z
    .string()
    .optional()
    .transform((value) => value === "on"),
  origin: z.enum(["m", "admin"]).default("m"),
});

export async function reportFaultAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = reportSchema.safeParse(formFields(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: INVALID,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: faultId, error } = await supabase.rpc("report_fault", {
    p_machine_id: parsed.data.machineId,
    p_description: parsed.data.description,
    p_machine_stopped: parsed.data.stopped,
  });
  if (error || !faultId) return { ok: false, message: toUserMessage(error) };

  revalidatePath("/admin/maintenance/faults");
  revalidatePath("/m/faults");
  redirect(
    parsed.data.origin === "admin"
      ? `/admin/maintenance/faults/${faultId}?created=1`
      : `/m/faults/${faultId}?created=1`,
  );
}

const assignSchema = z
  .object({
    faultId: z.uuid(),
    title: optionalText(200),
    description: optionalText(5000),
    due: localDueSchema,
  })
  .and(assignmentSchema);

export async function assignRepairAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = assignSchema.safeParse(formFields(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: INVALID,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const input = parsed.data;
  const dueAt = input.due
    ? zonedLocalToDate(
        input.due,
        (await getFactorySettings()).timeZone,
      ).toISOString()
    : undefined;

  const supabase = await createClient();
  const { data: taskId, error } = await supabase.rpc("assign_fault_repair", {
    p_fault_id: input.faultId,
    p_title: input.title ?? undefined,
    p_description: input.description ?? undefined,
    p_due_at: dueAt,
    p_assignee_ids:
      input.assignMode === "person" && input.assigneeId
        ? [input.assigneeId]
        : undefined,
    p_team_id:
      input.assignMode === "team" ? (input.teamId ?? undefined) : undefined,
  });
  if (error || !taskId) return { ok: false, message: toUserMessage(error) };

  revalidatePath("/admin/maintenance/faults");
  revalidatePath(`/admin/maintenance/faults/${input.faultId}`);
  redirect(`/admin/tasks/${taskId}?created=1`);
}

const rejectSchema = z.object({
  faultId: z.uuid(),
  reason: text.pipe(
    z.string().min(3, "اكتب سبب الرفض").max(2000, "النص طويل جداً"),
  ),
});

export async function rejectFaultAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = rejectSchema.safeParse(formFields(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: INVALID,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_fault", {
    p_fault_id: parsed.data.faultId,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, message: toUserMessage(error) };

  revalidatePath("/admin/maintenance/faults");
  revalidatePath(`/admin/maintenance/faults/${parsed.data.faultId}`);
  return { ok: true, message: "رُفض البلاغ وأُبلغ صاحبه" };
}
