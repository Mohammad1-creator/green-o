"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { type ActionState, formFields } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/dal";
import { toUserMessage } from "@/lib/errors";
import { getFactorySettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { zonedLocalToDate } from "@/lib/zoned-time";

const SIGNED_OUT: ActionState = {
  ok: false,
  message: "انتهت الجلسة. سجّل الدخول مرة أخرى.",
};

function refresh(taskId: string) {
  revalidatePath(`/admin/tasks/${taskId}`);
  revalidatePath(`/m/tasks/${taskId}`);
}

const commentSchema = z.object({
  taskId: z.uuid(),
  body: z
    .string()
    .optional()
    .transform((value) => (value ?? "").trim())
    .pipe(z.string().min(1, "اكتب التعليق").max(2000, "التعليق طويل جداً")),
});

export async function addCommentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = commentSchema.safeParse(formFields(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "اكتب التعليق",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_task_comment", {
    p_task_id: parsed.data.taskId,
    p_body: parsed.data.body,
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  refresh(parsed.data.taskId);
  return { ok: true, message: "أُضيف التعليق" };
}

const attachmentSchema = z.object({
  taskId: z.uuid(),
  path: z.string().min(1).max(300),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
});

/** Records a photo the browser has just uploaded to the task's folder. */
export async function registerAttachmentAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!(await getCurrentUser()))
    return { ok: false, message: "انتهت الجلسة. سجّل الدخول مرة أخرى." };
  const parsed = attachmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "الصورة غير صالحة" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("register_task_attachment", {
    p_task_id: parsed.data.taskId,
    p_path: parsed.data.path,
    p_mime_type: parsed.data.mimeType,
    p_size_bytes: parsed.data.size,
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  refresh(parsed.data.taskId);
  return { ok: true };
}

export async function deleteAttachmentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = z
    .object({ attachmentId: z.uuid(), taskId: z.uuid() })
    .safeParse(formFields(formData));
  if (!parsed.success) return { ok: false, message: "طلب غير صالح" };

  const supabase = await createClient();
  const { data: path, error } = await supabase.rpc("mark_attachment_deleted", {
    p_attachment_id: parsed.data.attachmentId,
  });
  if (error || !path) return { ok: false, message: toUserMessage(error) };

  // The row is already hidden; removing the file is best effort.
  await supabase.storage.from("attachments").remove([path]);
  refresh(parsed.data.taskId);
  return { ok: true, message: "حُذفت الصورة" };
}

const reminderSchema = z.object({
  taskId: z.uuid(),
  remindAt: z
    .string()
    .optional()
    .transform((value) => (value ?? "").trim())
    .pipe(
      z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "اختر وقت التذكير"),
    ),
});

export async function addReminderAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = reminderSchema.safeParse(formFields(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "اختر وقت التذكير",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { timeZone } = await getFactorySettings();
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_task_reminder", {
    p_task_id: parsed.data.taskId,
    p_remind_at: zonedLocalToDate(parsed.data.remindAt, timeZone).toISOString(),
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  refresh(parsed.data.taskId);
  return { ok: true, message: "أُضيف التذكير" };
}

export async function deleteReminderAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = z
    .object({ reminderId: z.uuid(), taskId: z.uuid() })
    .safeParse(formFields(formData));
  if (!parsed.success) return { ok: false, message: "طلب غير صالح" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_task_reminder", {
    p_reminder_id: parsed.data.reminderId,
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  refresh(parsed.data.taskId);
  return { ok: true, message: "حُذف التذكير" };
}
