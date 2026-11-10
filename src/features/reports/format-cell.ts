import { formatNumber, formatPercent } from "@/lib/format";

import type { ColumnType } from "./definitions";

/** A report value as text for the screen and the print page. */
export function formatCell(
  type: ColumnType,
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value;
  switch (type) {
    case "percent":
      return formatPercent(value);
    case "hours":
      return formatNumber(Math.round(value * 10) / 10);
    default:
      return formatNumber(value);
  }
}
