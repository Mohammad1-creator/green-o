export type OrderStatus = "open" | "in_progress" | "completed" | "cancelled";
export type OrderStageStatus = "pending" | "active" | "closed";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  open: "لم يبدأ",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغى",
};

export const ORDER_STAGE_STATUS_LABELS: Record<OrderStageStatus, string> = {
  pending: "لم تبدأ",
  active: "جارية",
  closed: "مغلقة",
};

export const ORDER_VIEWS = {
  running: { label: "الجارية", statuses: ["open", "in_progress"] },
  completed: { label: "المكتملة", statuses: ["completed"] },
  cancelled: { label: "الملغاة", statuses: ["cancelled"] },
  all: {
    label: "الكل",
    statuses: ["open", "in_progress", "completed", "cancelled"],
  },
} as const satisfies Record<
  string,
  { label: string; statuses: readonly OrderStatus[] }
>;

export type OrderView = keyof typeof ORDER_VIEWS;

export function isOrderView(value: unknown): value is OrderView {
  return typeof value === "string" && value in ORDER_VIEWS;
}

/** The human-readable order number, e.g. P-000012. */
export function orderCode(number: number): string {
  return `P-${String(number).padStart(6, "0")}`;
}

export function isOrderClosed(status: OrderStatus): boolean {
  return status === "completed" || status === "cancelled";
}

/** Share of the input already recorded, from 0 to 1. */
export function stageProgress(stage: {
  input_qty: number | null;
  good_qty: number;
  defect_qty: number;
}): number {
  const input = stage.input_qty ?? 0;
  if (input <= 0) return 0;
  return Math.min(1, (stage.good_qty + stage.defect_qty) / input);
}
