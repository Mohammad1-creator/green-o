"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { type ActionState, formFields } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/dal";
import { parseDecimal } from "@/lib/digits";
import { toUserMessage } from "@/lib/errors";
import { formText, optionalFormText, optionalUuid } from "@/lib/form-schemas";
import { createClient } from "@/lib/supabase/server";

const SIGNED_OUT: ActionState = {
  ok: false,
  message: "انتهت الجلسة. سجّل الدخول مرة أخرى.",
};
const INVALID = "تحقق من الحقول المحددة";
const ORDERS = "/admin/production/orders";

function invalid(error: z.ZodError): ActionState {
  return {
    ok: false,
    message: INVALID,
    fieldErrors: z.flattenError(error).fieldErrors,
  };
}

/** A quantity with at most three decimals; Arabic digits and "٫" accepted. */
function quantity({
  allowZero,
  required,
}: {
  allowZero: boolean;
  required: boolean;
}) {
  return formText.transform((value, ctx) => {
    if (value === "") {
      if (!required) return 0;
      ctx.addIssue({ code: "custom", message: "اكتب الكمية" });
      return z.NEVER;
    }
    const number = parseDecimal(value);
    if (number === null || number < 0 || (!allowZero && number === 0)) {
      ctx.addIssue({ code: "custom", message: "اكتب كمية صحيحة" });
      return z.NEVER;
    }
    const fraction = value.split(/[.٫,]/)[1] ?? "";
    if (fraction.length > 3) {
      ctx.addIssue({ code: "custom", message: "ثلاث خانات عشرية على الأكثر" });
      return z.NEVER;
    }
    return number;
  });
}

const dateField = formText.pipe(
  z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "اختر تاريخاً صحيحاً")
    .transform((value) => value || null),
);

function revalidateOrder(orderId: string) {
  revalidatePath(ORDERS);
  revalidatePath(`${ORDERS}/${orderId}`);
  revalidatePath("/m/production", "layout");
}

// -----------------------------------------------------------------------------
// Orders
// -----------------------------------------------------------------------------
const createSchema = z.object({
  productId: z.uuid("اختر المنتج"),
  quantity: quantity({ allowZero: false, required: true }),
  dueDate: dateField,
  notes: optionalFormText(2000),
  departmentId: optionalUuid,
});

export async function createOrderAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = createSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalid(parsed.error);
  const input = parsed.data;

  const supabase = await createClient();
  const { data: orderId, error } = await supabase.rpc(
    "create_production_order",
    {
      p_product_id: input.productId,
      p_quantity: input.quantity,
      p_due_date: input.dueDate ?? undefined,
      p_notes: input.notes ?? undefined,
      p_department_id: input.departmentId ?? undefined,
    },
  );
  if (error || !orderId) return { ok: false, message: toUserMessage(error) };
  revalidatePath(ORDERS);
  redirect(`${ORDERS}/${orderId}?created=1`);
}

const updateSchema = z.object({
  orderId: z.uuid(),
  quantity: quantity({ allowZero: false, required: true }),
  dueDate: dateField,
  notes: optionalFormText(2000),
});

export async function updateOrderAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = updateSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalid(parsed.error);
  const input = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_production_order", {
    p_order_id: input.orderId,
    p_quantity: input.quantity,
    p_due_date: input.dueDate ?? undefined,
    p_notes: input.notes ?? undefined,
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  revalidateOrder(input.orderId);
  return { ok: true, message: "حُفظت بيانات الأمر" };
}

const reason = formText.pipe(
  z
    .string()
    .min(3, "اكتب السبب (3 أحرف على الأقل)")
    .max(2000, "النص طويل جداً"),
);

export async function cancelOrderAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = z
    .object({ orderId: z.uuid(), reason })
    .safeParse(formFields(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { orderId } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_production_order", {
    p_order_id: orderId,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  revalidateOrder(orderId);
  return { ok: true, message: "أُلغي الأمر" };
}

// -----------------------------------------------------------------------------
// Stages
// -----------------------------------------------------------------------------
export async function assignWorkersAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = z
    .object({
      orderId: z.uuid(),
      orderStageId: z.uuid(),
      workerIds: z.array(z.uuid()).max(100),
    })
    .safeParse({
      orderId: formData.get("orderId"),
      orderStageId: formData.get("orderStageId"),
      workerIds: formData.getAll("workerIds"),
    });
  if (!parsed.success) return { ok: false, message: INVALID };

  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_stage_workers", {
    p_order_stage_id: parsed.data.orderStageId,
    p_user_ids: parsed.data.workerIds,
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  revalidateOrder(parsed.data.orderId);
  return { ok: true, message: "حُفظ عمال المرحلة" };
}

export async function closeStageAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = z
    .object({ orderId: z.uuid(), orderStageId: z.uuid() })
    .safeParse(formFields(formData));
  if (!parsed.success) return { ok: false, message: INVALID };

  const supabase = await createClient();
  const { error } = await supabase.rpc("close_order_stage", {
    p_order_stage_id: parsed.data.orderStageId,
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  revalidateOrder(parsed.data.orderId);
  return { ok: true, message: "أُغلقت المرحلة" };
}

// -----------------------------------------------------------------------------
// Quantities
// -----------------------------------------------------------------------------
const entrySchema = z
  .object({
    orderId: z.uuid(),
    orderStageId: z.uuid(),
    goodQty: quantity({ allowZero: true, required: false }),
    defectQty: quantity({ allowZero: true, required: false }),
    defectTypeId: optionalUuid,
    note: optionalFormText(500),
    workerId: optionalUuid,
  })
  .superRefine((value, ctx) => {
    if (value.goodQty + value.defectQty === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["goodQty"],
        message: "اكتب الكمية السليمة أو المعيبة",
      });
    }
    if (value.defectQty > 0 && !value.defectTypeId) {
      ctx.addIssue({
        code: "custom",
        path: ["defectTypeId"],
        message: "اختر نوع العيب",
      });
    }
  });

export async function recordEntryAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = entrySchema.safeParse(formFields(formData));
  if (!parsed.success) return invalid(parsed.error);
  const input = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_stage_entry", {
    p_order_stage_id: input.orderStageId,
    p_good_qty: input.goodQty,
    p_defect_qty: input.defectQty,
    p_defect_type_id:
      input.defectQty > 0 ? (input.defectTypeId ?? undefined) : undefined,
    p_note: input.note ?? undefined,
    p_worker_id: input.workerId ?? undefined,
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  revalidateOrder(input.orderId);
  return { ok: true, message: "سُجّلت الكمية" };
}

export async function voidEntryAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = z
    .object({ entryId: z.uuid(), orderId: z.uuid(), reason })
    .safeParse(formFields(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("void_stage_entry", {
    p_entry_id: parsed.data.entryId,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  revalidateOrder(parsed.data.orderId);
  return { ok: true, message: "أُلغي الإدخال" };
}
