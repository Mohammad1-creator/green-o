"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { type ActionState, formFields } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/dal";
import { isManagerRole } from "@/lib/auth/roles";
import { toUserMessage } from "@/lib/errors";
import { getFactorySettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { zonedLocalToDate } from "@/lib/zoned-time";

import {
  createTaskSchema,
  reasonSchema,
  reassignTaskSchema,
  submitSchema,
  taskIdSchema,
  updateTaskSchema,
} from "./schemas";

const NOT_ALLOWED: ActionState = {
  ok: false,
  message: "ليست لديك صلاحية لهذا الإجراء",
};
const SIGNED_OUT: ActionState = {
  ok: false,
  message: "انتهت الجلسة. سجّل الدخول مرة أخرى.",
};
const INVALID = "تحقق من الحقول المحددة";

function refresh(taskId?: string) {
  revalidatePath("/admin/tasks");
  revalidatePath("/m");
  if (taskId) {
    revalidatePath(`/admin/tasks/${taskId}`);
    revalidatePath(`/m/tasks/${taskId}`);
  }
}

async function toDueIso(local: string | null): Promise<string | null> {
  if (!local) return null;
  const { timeZone } = await getFactorySettings();
  return zonedLocalToDate(local, timeZone).toISOString();
}

function invalid(error: z.ZodError): ActionState {
  return {
    ok: false,
    message: INVALID,
    fieldErrors: z.flattenError(error).fieldErrors,
  };
}

// --- Managers -------------------------------------------------------------------

export async function createTaskAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await getCurrentUser();
  if (!viewer || !isManagerRole(viewer.role)) return NOT_ALLOWED;

  const parsed = createTaskSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalid(parsed.error);
  const input = parsed.data;

  const supabase = await createClient();
  const { data: taskId, error } = await supabase.rpc("create_task", {
    p_title: input.title,
    p_description: input.description ?? undefined,
    p_due_at: (await toDueIso(input.due)) ?? undefined,
    p_department_id:
      (viewer.role === "general_manager" ? input.departmentId : null) ??
      undefined,
    p_assignee_ids:
      input.assignMode === "person" && input.assigneeId
        ? [input.assigneeId]
        : undefined,
    p_team_id:
      input.assignMode === "team" ? (input.teamId ?? undefined) : undefined,
  });
  if (error || !taskId) return { ok: false, message: toUserMessage(error) };

  refresh();
  redirect(`/admin/tasks/${taskId}?created=1`);
}

export async function updateTaskAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = updateTaskSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalid(parsed.error);
  const input = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_task", {
    p_task_id: input.taskId,
    p_title: input.title,
    p_description: input.description ?? undefined,
    p_due_at: (await toDueIso(input.due)) ?? undefined,
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  refresh(input.taskId);
  return { ok: true, message: "حُفظت التغييرات" };
}

export async function reassignTaskAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = reassignTaskSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalid(parsed.error);
  const input = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("reassign_task", {
    p_task_id: input.taskId,
    p_assignee_ids:
      input.assignMode === "person" && input.assigneeId
        ? [input.assigneeId]
        : undefined,
    p_team_id:
      input.assignMode === "team" ? (input.teamId ?? undefined) : undefined,
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  refresh(input.taskId);
  return { ok: true, message: "تغيّر الإسناد" };
}

export async function approveTaskAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = taskIdSchema.safeParse(formFields(formData));
  if (!parsed.success) return { ok: false, message: "طلب غير صالح" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_task", {
    p_task_id: parsed.data.taskId,
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  refresh(parsed.data.taskId);
  return { ok: true, message: "اعتُمدت المهمة" };
}

export async function returnTaskAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = reasonSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("return_task", {
    p_task_id: parsed.data.taskId,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  refresh(parsed.data.taskId);
  return { ok: true, message: "أُعيدت المهمة للمتابعة" };
}

export async function cancelTaskAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = reasonSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_task", {
    p_task_id: parsed.data.taskId,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  refresh(parsed.data.taskId);
  return { ok: true, message: "أُلغيت المهمة" };
}

// --- Assignees ------------------------------------------------------------------

async function assigneeStep(
  formData: FormData,
  fn: "acknowledge_task" | "start_task",
  message: string,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = taskIdSchema.safeParse(formFields(formData));
  if (!parsed.success) return { ok: false, message: "طلب غير صالح" };

  const supabase = await createClient();
  const { error } = await supabase.rpc(fn, { p_task_id: parsed.data.taskId });
  if (error) return { ok: false, message: toUserMessage(error) };
  refresh(parsed.data.taskId);
  return { ok: true, message };
}

export async function acknowledgeTaskAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return assigneeStep(formData, "acknowledge_task", "استلمت المهمة");
}

export async function startTaskAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return assigneeStep(formData, "start_task", "بدأ التنفيذ");
}

export async function submitTaskAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = submitSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_task", {
    p_task_id: parsed.data.taskId,
    p_note: parsed.data.note ?? undefined,
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  refresh(parsed.data.taskId);
  return { ok: true, message: "أُرسلت المهمة للاعتماد" };
}

/** Records that the assignee opened the task (called once from the page). */
export async function markTaskSeen(taskId: unknown): Promise<void> {
  const parsed = z.uuid().safeParse(taskId);
  if (!parsed.success || !(await getCurrentUser())) return;
  const supabase = await createClient();
  await supabase.rpc("mark_task_seen", { p_task_id: parsed.data });
}
