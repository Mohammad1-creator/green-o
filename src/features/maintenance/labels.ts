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
