"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { type ActionState, formFields } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/dal";
import { canRecordViolations, SAFETY_ROLES } from "@/lib/auth/roles";
import { toUserMessage } from "@/lib/errors";
import {
  checkbox,
  formText,
  optionalFormText,
  wholeNumber,
} from "@/lib/form-schemas";
import { getFactorySettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { zonedLocalToDate } from "@/lib/zoned-time";

import { SEVERITIES } from "./labels";

const SIGNED_OUT: ActionState = {
  ok: false,
  message: "انتهت الجلسة. سجّل الدخول مرة أخرى.",
};

function refresh(id?: string) {
  revalidatePath("/m/violations");
  revalidatePath("/admin/safety/violations");
  revalidatePath("/admin/points");
  revalidatePath("/m");
  if (id) {
    revalidatePath(`/m/violations/${id}`);
    revalidatePath(`/admin/safety/violations/${id}`);
  }
}

const reason = (message: string) =>
  formText.pipe(z.string().min(3, message).max(1000, "النص طويل جداً"));

// -----------------------------------------------------------------------------
// Recording
// -----------------------------------------------------------------------------
const recordSchema = z.object({
  employeeId: z.uuid("اختر الموظف"),
  typeId: z.uuid("اختر نوع المخالفة"),
  description: formText.pipe(
    z.string().min(3, "اكتب وصف المخالفة").max(2000, "الوصف طويل جداً"),
  ),
  location: optionalFormText(200),
  occurredAt: formText.pipe(
    z.string().regex(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})?$/, "اختر وقت المخالفة"),
  ),
  from: z.enum(["m", "admin"]).catch("m"),
});

export async function recordViolationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await getCurrentUser();
  if (!viewer) return SIGNED_OUT;
  if (!canRecordViolations(viewer.role)) {
    return { ok: false, message: "تسجيل المخالفات لمدير السلامة ومشرفيها" };
  }
  const parsed = recordSchema.safeParse(formFields(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "راجع الحقول المظللة",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const input = parsed.data;
  const { timeZone } = await getFactorySettings();

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("record_violation", {
    p_employee_id: input.employeeId,
    p_type_id: input.typeId,
    p_description: input.description,
    p_location: input.location ?? undefined,
    p_occurred_at: input.occurredAt
      ? zonedLocalToDate(input.occurredAt, timeZone).toISOString()
      : undefined,
  });
  if (error || !id) return { ok: false, message: toUserMessage(error) };
  refresh();
  redirect(
    input.from === "admin"
      ? `/admin/safety/violations/${id}?created=1`
      : `/m/violations/${id}?created=1`,
  );
}

// -----------------------------------------------------------------------------
// The employee's answer
// -----------------------------------------------------------------------------
const idSchema = z.object({ violationId: z.uuid() });

export async function acceptViolationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = idSchema.safeParse(formFields(formData));
  if (!parsed.success) return { ok: false, message: "طلب غير صالح" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_violation", {
    p_id: parsed.data.violationId,
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  refresh(parsed.data.violationId);
  return { ok: true, message: "سُجّل قبولك للمخالفة" };
}

export async function objectViolationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = idSchema
    .extend({ reason: reason("اكتب سبب الاعتراض") })
    .safeParse(formFields(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "اكتب سبب الاعتراض",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("object_violation", {
    p_id: parsed.data.violationId,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  refresh(parsed.data.violationId);
  return { ok: true, message: "أُرسل اعتراضك إلى مدير السلامة" };
}

// -----------------------------------------------------------------------------
// The safety manager's decisions
// -----------------------------------------------------------------------------
export async function decideObjectionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = idSchema
    .extend({
      decision: z.enum(["uphold", "reject"], "اختر القرار"),
      note: reason("اكتب سبب القرار"),
    })
    .safeParse(formFields(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "اكتب سبب القرار",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_violation_objection", {
    p_id: parsed.data.violationId,
    p_uphold: parsed.data.decision === "uphold",
    p_note: parsed.data.note,
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  refresh(parsed.data.violationId);
  return {
    ok: true,
    message:
      parsed.data.decision === "uphold"
        ? "قُبل الاعتراض وأُلغيت المخالفة"
        : "رُفض الاعتراض وثبتت المخالفة",
  };
}

export async function cancelViolationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = idSchema
    .extend({ reason: reason("اكتب سبب الإلغاء") })
    .safeParse(formFields(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "اكتب سبب الإلغاء",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_violation", {
    p_id: parsed.data.violationId,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  refresh(parsed.data.violationId);
  return { ok: true, message: "أُلغيت المخالفة" };
}

// -----------------------------------------------------------------------------
// Violation types
// -----------------------------------------------------------------------------
const typeSchema = z.object({
  name: formText.pipe(
    z.string().min(2, "اكتب اسم المخالفة").max(120, "الاسم طويل جداً"),
  ),
  severity: z.enum(SEVERITIES, "اختر درجة الخطورة"),
  points: formText.pipe(wholeNumber(0, 1000)),
  description: optionalFormText(1000),
});

async function requireSafetyManager() {
  const viewer = await getCurrentUser();
  if (!viewer) return SIGNED_OUT;
  if (!SAFETY_ROLES.includes(viewer.role)) {
    return { ok: false, message: "أنواع المخالفات لمدير السلامة" };
  }
  return null;
}

export async function createViolationTypeAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await requireSafetyManager();
  if (denied) return denied;
  const parsed = typeSchema.safeParse(formFields(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "راجع الحقول المظللة",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("violation_types").insert({
    name: parsed.data.name,
    severity: parsed.data.severity,
    points: parsed.data.points,
    description: parsed.data.description,
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  revalidatePath("/admin/safety/types");
  return { ok: true, message: "أُضيف نوع المخالفة" };
}

export async function updateViolationTypeAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await requireSafetyManager();
  if (denied) return denied;
  const parsed = typeSchema
    .extend({ typeId: z.uuid(), isActive: checkbox })
    .safeParse(formFields(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "راجع الحقول المظللة",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("violation_types")
    .update({
      name: parsed.data.name,
      severity: parsed.data.severity,
      points: parsed.data.points,
      description: parsed.data.description,
      is_active: parsed.data.isActive,
    })
    .eq("id", parsed.data.typeId)
    .select("id");
  if (error) return { ok: false, message: toUserMessage(error) };
  if (!data?.length) {
    return { ok: false, message: "ليست لديك صلاحية لهذا الإجراء" };
  }
  revalidatePath("/admin/safety/types");
  return { ok: true, message: "حُفظ نوع المخالفة" };
}
