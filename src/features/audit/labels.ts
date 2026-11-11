/** Arabic names for the audited tables. */
export const TABLE_LABELS: Record<string, string> = {
  "public.app_settings": "الإعدادات",
  "public.departments": "الأقسام",
  "public.profiles": "المستخدمون",
  "public.employee_details": "بيانات الموظفين",
  "auth.users": "حسابات الدخول",
  "public.teams": "الفرق",
  "public.team_members": "أعضاء الفرق",
  "public.tasks": "المهام",
  "public.task_assignees": "المسند إليهم",
  "public.attachments": "الصور المرفقة",
  "public.machines": "الآلات",
  "public.fault_reports": "بلاغات الأعطال",
  "public.pm_plans": "خطط الصيانة الوقائية",
  "public.spec_definitions": "المواصفات",
  "public.products": "المنتجات",
  "public.product_route_steps": "مسارات المنتجات",
  "public.stages": "المراحل",
  "public.defect_types": "أنواع العيوب",
  "public.production_orders": "أوامر الإنتاج",
  "public.order_stages": "مراحل الأوامر",
  "public.order_stage_assignees": "عمال المراحل",
  "public.stage_entries": "إدخالات الكميات",
  "public.task_points": "نقاط المهام",
};

export const ACTION_LABELS: Record<string, string> = {
  insert: "إضافة",
  update: "تعديل",
  delete: "حذف",
  password_reset: "إعادة تعيين كلمة المرور",
};

/** Common column names; anything else is shown as stored. */
export const FIELD_LABELS: Record<string, string> = {
  name: "الاسم",
  full_name: "الاسم",
  title: "العنوان",
  description: "الوصف",
  status: "الحالة",
  role: "الدور",
  department_id: "القسم",
  is_active: "نشط",
  due_at: "موعد الاستحقاق",
  due_date: "تاريخ التسليم",
  quantity: "الكمية",
  good_qty: "الكمية السليمة",
  defect_qty: "الكمية المعيبة",
  void_reason: "سبب الإلغاء",
  voided_at: "وقت الإلغاء",
  cancel_reason: "سبب الإلغاء",
  specs: "المواصفات",
  code: "الرمز",
  unit: "الوحدة",
  notes: "ملاحظات",
  stages: "المراحل",
  factory_name: "اسم المصنع",
  timezone: "المنطقة الزمنية",
  employee_no: "رقم الموظف",
  phone: "الهاتف",
  job_title: "المسمى الوظيفي",
  machine_stopped: "الآلة متوقفة",
  resolution_notes: "ملاحظات الإصلاح",
  rejection_reason: "سبب الرفض",
};

export function tableLabel(table: string): string {
  return TABLE_LABELS[table] ?? table;
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

/** A stored value as short text. */
export function valueText(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return JSON.stringify(value);
}

type Json = Record<string, unknown> | null;

/**
 * The fields worth showing for an entry: what changed for an update, or
 * the values for an insert or delete (skipping bookkeeping columns).
 */
export function entryFields(entry: {
  action: string;
  changed_fields: string[] | null;
  old_data: Json;
  new_data: Json;
}): { field: string; before: string | null; after: string | null }[] {
  const hidden = new Set(["id", "created_at", "updated_at", "created_by"]);
  if (entry.action === "update" && entry.changed_fields) {
    return entry.changed_fields.map((field) => ({
      field,
      before: valueText(entry.old_data?.[field]),
      after: valueText(entry.new_data?.[field]),
    }));
  }
  const data = entry.action === "delete" ? entry.old_data : entry.new_data;
  return Object.entries(data ?? {})
    .filter(([field, value]) => !hidden.has(field) && value !== null)
    .map(([field, value]) => ({
      field,
      before: entry.action === "delete" ? valueText(value) : null,
      after: entry.action === "delete" ? null : valueText(value),
    }));
}
