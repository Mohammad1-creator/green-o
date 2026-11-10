import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/format";

import {
  ORDER_STAGE_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  type OrderStageStatus,
  type OrderStatus,
} from "../order-labels";

const ORDER_VARIANTS: Record<
  OrderStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  open: "outline",
  in_progress: "default",
  completed: "secondary",
  cancelled: "outline",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={ORDER_VARIANTS[status]}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

export function StageStatusBadge({ status }: { status: OrderStageStatus }) {
  return (
    <Badge variant={status === "active" ? "default" : "outline"}>
      {ORDER_STAGE_STATUS_LABELS[status]}
    </Badge>
  );
}

/** "60 لوح" */
export function quantityText(value: number, unit: string): string {
  return `${formatNumber(value)} ${unit}`;
}

/**
 * A thin bar of one stage's input: good, then defective, then what is
 * still available. The figures beside it carry the values; the bar is
 * a glance aid, so it is hidden from screen readers.
 */
export function StageBar({
  input,
  good,
  defect,
}: {
  input: number;
  good: number;
  defect: number;
}) {
  const share = (value: number) =>
    input > 0 ? `${Math.min(100, (value / input) * 100)}%` : "0%";
  return (
    <div
      aria-hidden
      className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-muted"
    >
      {good > 0 ? (
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: share(good) }}
        />
      ) : null}
      {defect > 0 ? (
        <div
          className="h-full rounded-full bg-destructive"
          style={{ width: share(defect) }}
        />
      ) : null}
    </div>
  );
}

export function StageBarLegend() {
  return (
    <div aria-hidden className="flex gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-primary" />
        سليم
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-destructive" />
        معيب
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-muted ring-1 ring-border" />
        متاح
      </span>
    </div>
  );
}
