import type { Database } from "@/types/database";

export type ViolationSeverity =
  Database["public"]["Enums"]["violation_severity"];
export type ViolationStatus = Database["public"]["Enums"]["violation_status"];

export const SEVERITIES = ["low", "medium", "high", "critical"] as const;

export const SEVERITY_LABELS: Record<ViolationSeverity, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  critical: "خطيرة جداً",
};

export const VIOLATION_STATUS_LABELS: Record<ViolationStatus, string> = {
  pending: "بانتظار رد الموظف",
  accepted: "قبلها الموظف",
  objected: "اعتراض بانتظار القرار",
  confirmed: "ثابتة بعد الاعتراض",
  cancelled: "ملغاة",
};

export const VIOLATION_STATUSES = Object.keys(
  VIOLATION_STATUS_LABELS,
) as ViolationStatus[];

export function violationCode(number: number): string {
  return `V-${String(number).padStart(6, "0")}`;
}

/** A violation that is not cancelled deducts its points. */
export function deductsPoints(status: ViolationStatus): boolean {
  return status !== "cancelled";
}
