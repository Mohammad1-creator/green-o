export type MachineStatus =
  "operational" | "down" | "under_maintenance" | "retired";
export type FaultStatus = "open" | "assigned" | "resolved" | "rejected";

export const MACHINE_STATUS_LABELS: Record<MachineStatus, string> = {
  operational: "تعمل",
  down: "متوقفة",
  under_maintenance: "تحت الصيانة",
  retired: "خارج الخدمة",
};

export const MACHINE_STATUSES = Object.keys(
  MACHINE_STATUS_LABELS,
) as MachineStatus[];

export const FAULT_STATUS_LABELS: Record<FaultStatus, string> = {
  open: "مفتوح",
  assigned: "أُسند إصلاحه",
  resolved: "تم الإصلاح",
  rejected: "مرفوض",
};

export const FAULT_VIEWS = {
  open: { label: "بانتظار الإسناد", statuses: ["open"] },
  assigned: { label: "قيد الإصلاح", statuses: ["assigned"] },
  resolved: { label: "تم إصلاحها", statuses: ["resolved"] },
  rejected: { label: "المرفوضة", statuses: ["rejected"] },
  all: {
    label: "الكل",
    statuses: ["open", "assigned", "resolved", "rejected"],
  },
} as const satisfies Record<
  string,
  { label: string; statuses: readonly FaultStatus[] }
>;

export type FaultView = keyof typeof FAULT_VIEWS;

export function isFaultView(value: unknown): value is FaultView {
  return typeof value === "string" && value in FAULT_VIEWS;
}

/** The human-readable fault number, e.g. F-000045. */
export function faultCode(number: number): string {
  return `F-${String(number).padStart(6, "0")}`;
}

export type IntervalUnit = "day" | "week" | "month";

export const INTERVAL_UNITS: readonly IntervalUnit[] = ["day", "week", "month"];

/** For the "every N ..." picker. */
export const INTERVAL_UNIT_LABELS: Record<IntervalUnit, string> = {
  day: "يوم",
  week: "أسبوع",
  month: "شهر",
};

// Arabic counted nouns: 1 and 2 have their own forms, 3–10 take the
// plural, 11 and above take the singular accusative.
const COUNTED: Record<
  IntervalUnit,
  { one: string; two: string; few: string; many: string }
> = {
  day: { one: "كل يوم", two: "كل يومين", few: "أيام", many: "يوماً" },
  week: { one: "كل أسبوع", two: "كل أسبوعين", few: "أسابيع", many: "أسبوعاً" },
  month: { one: "كل شهر", two: "كل شهرين", few: "أشهر", many: "شهراً" },
};

/** "كل أسبوع", "كل شهرين", "كل 3 أشهر", "كل 14 يوماً". */
export function intervalLabel(unit: IntervalUnit, count: number): string {
  const forms = COUNTED[unit];
  if (count === 1) return forms.one;
  if (count === 2) return forms.two;
  return `كل ${count} ${count <= 10 ? forms.few : forms.many}`;
}
