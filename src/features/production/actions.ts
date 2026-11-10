"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { type ActionState, formFields } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/dal";
import { toUserMessage } from "@/lib/errors";
import {
  checkbox,
  formText,
  optionalDecimal,
  optionalFormText,
  optionalUuid,
  wholeNumber,
} from "@/lib/form-schemas";
import { createClient } from "@/lib/supabase/server";

import { buildSpecsSchema, formDefinitions, SPEC_TYPES } from "./specs";

const SIGNED_OUT: ActionState = {
  ok: false,
  message: "انتهت الجلسة. سجّل الدخول مرة أخرى.",
};
const INVALID = "تحقق من الحقول المحددة";
const SETTINGS = "/admin/production/settings";
const PRODUCTS = "/admin/production/products";

function invalid(error: z.ZodError): ActionState {
  return {
    ok: false,
    message: INVALID,
    fieldErrors: z.flattenError(error).fieldErrors,
  };
}

function duplicate(field: string, message: string): ActionState {
  return { ok: false, message: INVALID, fieldErrors: { [field]: [message] } };
}

// -----------------------------------------------------------------------------
// Specifications
// -----------------------------------------------------------------------------
const specSchema = z
  .object({
    specId: optionalUuid,
    label: formText.pipe(
      z.string().min(1, "اكتب اسم المواصفة").max(80, "الاسم طويل جداً"),
    ),
    dataType: z.enum(SPEC_TYPES, "اختر نوع المواصفة"),
    unit: optionalFormText(20),
    options: z
      .string()
      .optional()
      .transform((value) =>
        (value ?? "")
          .split(/\r?\n/)
          .map((option) => option.trim())
          .filter(Boolean),
      ),
    minValue: optionalDecimal,
    maxValue: optionalDecimal,
    required: checkbox,
    sortOrder: formText
      .transform((value) => value || "0")
      .pipe(wholeNumber(0, 10000)),
  })
  .superRefine((value, ctx) => {
    if (value.dataType === "select" && value.options.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "اكتب خياراً واحداً على الأقل، كل خيار في سطر",
      });
    }
    if (
      value.dataType === "number" &&
      value.minValue !== null &&
      value.maxValue !== null &&
      value.minValue > value.maxValue
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["maxValue"],
        message: "الحد الأعلى أصغر من الحد الأدنى",
      });
    }
  });

export async function saveSpecAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = specSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalid(parsed.error);
  const input = parsed.data;
  const isNumber = input.dataType === "number";
  const row = {
    label: input.label,
    data_type: input.dataType,
    unit: isNumber ? input.unit : null,
    options: input.dataType === "select" ? input.options : null,
    min_value: isNumber ? input.minValue : null,
    max_value: isNumber ? input.maxValue : null,
    is_required: input.required,
    sort_order: input.sortOrder,
  };

  const supabase = await createClient();
  const { error } = input.specId
    ? await supabase.from("spec_definitions").update(row).eq("id", input.specId)
    : await supabase.from("spec_definitions").insert(row);
  if (error) {
    if (error.code === "23505") {
      return duplicate("label", "توجد مواصفة بهذا الاسم");
    }
    return { ok: false, message: toUserMessage(error) };
  }
  revalidatePath(SETTINGS);
  revalidatePath(PRODUCTS, "layout");
  return {
    ok: true,
    message: input.specId ? "حُفظت المواصفة" : "أُضيفت المواصفة",
  };
}

// -----------------------------------------------------------------------------
// Stages and defect types
// -----------------------------------------------------------------------------
const stageSchema = z.object({
  stageId: optionalUuid,
  name: formText.pipe(
    z.string().min(1, "اكتب اسم المرحلة").max(60, "الاسم طويل جداً"),
  ),
  sortOrder: formText
    .transform((value) => value || "0")
    .pipe(wholeNumber(0, 10000)),
});

export async function saveStageAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = stageSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { stageId, name, sortOrder } = parsed.data;

  const supabase = await createClient();
  const row = { name, sort_order: sortOrder };
  const { error } = stageId
    ? await supabase.from("stages").update(row).eq("id", stageId)
    : await supabase.from("stages").insert(row);
  if (error) {
    if (error.code === "23505")
      return duplicate("name", "توجد مرحلة بهذا الاسم");
    return { ok: false, message: toUserMessage(error) };
  }
  revalidatePath(SETTINGS);
  revalidatePath(PRODUCTS, "layout");
  return { ok: true, message: stageId ? "حُفظت المرحلة" : "أُضيفت المرحلة" };
}

const defectSchema = z.object({
  defectId: optionalUuid,
  name: formText.pipe(
    z.string().min(1, "اكتب اسم العيب").max(80, "الاسم طويل جداً"),
  ),
  stageId: optionalUuid,
});

export async function saveDefectTypeAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = defectSchema.safeParse(formFields(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { defectId, name, stageId } = parsed.data;

  const supabase = await createClient();
  const row = { name, stage_id: stageId };
  const { error } = defectId
    ? await supabase.from("defect_types").update(row).eq("id", defectId)
    : await supabase.from("defect_types").insert(row);
  if (error) {
    if (error.code === "23505") {
      return duplicate("name", "هذا العيب مسجل لهذه المرحلة");
    }
    return { ok: false, message: toUserMessage(error) };
  }
  revalidatePath(SETTINGS);
  return { ok: true, message: defectId ? "حُفظ نوع العيب" : "أُضيف نوع العيب" };
}

// -----------------------------------------------------------------------------
// Stopping and resuming catalog items
// -----------------------------------------------------------------------------
const activeSchema = z.object({
  kind: z.enum(["spec", "stage", "defect", "product"]),
  id: z.uuid(),
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export async function setCatalogItemActiveAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = activeSchema.safeParse(formFields(formData));
  if (!parsed.success) return { ok: false, message: INVALID };
  const { kind, id, active } = parsed.data;

  const supabase = await createClient();
  const change = { is_active: active };
  const { data, error } =
    kind === "spec"
      ? await supabase
          .from("spec_definitions")
          .update(change)
          .eq("id", id)
          .select("id")
      : kind === "stage"
        ? await supabase.from("stages").update(change).eq("id", id).select("id")
        : kind === "defect"
          ? await supabase
              .from("defect_types")
              .update(change)
              .eq("id", id)
              .select("id")
          : await supabase
              .from("products")
              .update(change)
              .eq("id", id)
              .select("id");
  if (error) return { ok: false, message: toUserMessage(error) };
  if (data.length === 0) {
    return { ok: false, message: "ليست لديك صلاحية لهذا الإجراء" };
  }
  revalidatePath(SETTINGS);
  revalidatePath(PRODUCTS, "layout");
  return { ok: true, message: active ? "فُعّل" : "أُوقف" };
}

// -----------------------------------------------------------------------------
// Products
// -----------------------------------------------------------------------------
const productSchema = z.object({
  productId: optionalUuid,
  code: formText.pipe(
    z.string().min(1, "اكتب رمز المنتج").max(40, "الرمز طويل جداً"),
  ),
  name: formText.pipe(
    z.string().min(1, "اكتب اسم المنتج").max(120, "الاسم طويل جداً"),
  ),
  unit: formText.pipe(
    z.string().min(1, "اكتب وحدة القياس").max(20, "الوحدة طويلة جداً"),
  ),
  notes: optionalFormText(2000),
});

export async function saveProductAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const fields = formFields(formData);
  const parsed = productSchema.safeParse(fields);

  // The specification fields are checked against the definitions as they
  // are now in the database, not as the form saw them.
  const supabase = await createClient();
  const { data: definitions, error: definitionsError } = await supabase
    .from("spec_definitions")
    .select(
      "id, label, data_type, unit, options, min_value, max_value, is_required, is_active",
    );
  if (definitionsError) {
    return { ok: false, message: toUserMessage(definitionsError) };
  }
  let current: Record<string, unknown> = {};
  if (parsed.success && parsed.data.productId) {
    const { data } = await supabase
      .from("products")
      .select("specs")
      .eq("id", parsed.data.productId)
      .maybeSingle();
    current = (data?.specs ?? {}) as Record<string, unknown>;
  }
  const specs = buildSpecsSchema(
    formDefinitions(definitions, current),
  ).safeParse(fields);
  if (!parsed.success || !specs.success) {
    return {
      ok: false,
      message: INVALID,
      fieldErrors: {
        ...(parsed.success ? {} : z.flattenError(parsed.error).fieldErrors),
        ...(specs.success ? {} : z.flattenError(specs.error).fieldErrors),
      },
    };
  }

  const input = parsed.data;
  const row = {
    code: input.code,
    name: input.name,
    unit: input.unit,
    notes: input.notes,
    specs: specs.data,
  };
  const { data, error } = input.productId
    ? await supabase
        .from("products")
        .update(row)
        .eq("id", input.productId)
        .select("id")
        .single()
    : await supabase.from("products").insert(row).select("id").single();
  if (error) {
    if (error.code === "23505") {
      return duplicate("code", "هذا الرمز مستخدم لمنتج آخر");
    }
    return { ok: false, message: toUserMessage(error) };
  }

  revalidatePath(PRODUCTS);
  if (!input.productId) redirect(`${PRODUCTS}/${data.id}?created=1`);
  revalidatePath(`${PRODUCTS}/${input.productId}`);
  return { ok: true, message: "حُفظ المنتج" };
}

export async function setProductRouteAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await getCurrentUser())) return SIGNED_OUT;
  const parsed = z
    .object({
      productId: z.uuid(),
      stageIds: z.array(z.uuid()).max(50, "الحد الأقصى 50 مرحلة"),
    })
    .safeParse({
      productId: formData.get("productId"),
      stageIds: formData.getAll("stageIds"),
    });
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_product_route", {
    p_product_id: parsed.data.productId,
    p_stage_ids: parsed.data.stageIds,
  });
  if (error) return { ok: false, message: toUserMessage(error) };
  revalidatePath(PRODUCTS);
  revalidatePath(`${PRODUCTS}/${parsed.data.productId}`);
  return { ok: true, message: "حُفظ مسار المنتج" };
}
