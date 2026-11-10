export const TASK_STATUSES = [
  "new",
  "received",
  "in_progress",
  "pending_approval",
  "completed",
  "needs_follow_up",
  "cancelled",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  new: "جديدة",
  received: "مستلمة",
  in_progress: "قيد التنفيذ",
  pending_approval: "بانتظار الاعتماد",
  completed: "مكتملة",
  needs_follow_up: "تحتاج متابعة",
  cancelled: "ملغاة",
};

/** Statuses in which the assignees still have work to do. */
export const OPEN_STATUSES: readonly TaskStatus[] = [
  "new",
  "received",
  "in_progress",
  "needs_follow_up",
];

export function isOpenStatus(status: TaskStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

export function isFinalStatus(status: TaskStatus): boolean {
  return status === "completed" || status === "cancelled";
}

export type TaskKind = "general" | "repair" | "preventive";

export const TASK_KIND_LABELS: Record<TaskKind, string> = {
  general: "مهمة",
  repair: "إصلاح",
  preventive: "صيانة وقائية",
};

/** The human-readable task number, e.g. T-000123. */
export function taskCode(number: number): string {
  return `T-${String(number).padStart(6, "0")}`;
}

export const TASK_EVENT_LABELS: Record<string, string> = {
  created: "أُنشئت المهمة",
  edited: "عُدّلت بيانات المهمة",
  reassigned: "تغيّر الإسناد",
  comment: "تعليق",
  attachment: "أُرفقت صورة",
  reminder: "أُرسل تذكير",
};

/** Lists for the admin filter. */
export const TASK_FILTERS = {
  open: { label: "المفتوحة", statuses: OPEN_STATUSES },
  pending_approval: {
    label: "بانتظار الاعتماد",
    statuses: ["pending_approval"],
  },
  completed: { label: "المكتملة", statuses: ["completed"] },
  cancelled: { label: "الملغاة", statuses: ["cancelled"] },
  all: { label: "الكل", statuses: TASK_STATUSES },
} as const satisfies Record<
  string,
  { label: string; statuses: readonly TaskStatus[] }
>;

export type TaskFilter = keyof typeof TASK_FILTERS;

export function isTaskFilter(value: unknown): value is TaskFilter {
  return typeof value === "string" && value in TASK_FILTERS;
}
