import { addDays } from "@/lib/zoned-time";

export type Period = { from: string; to: string };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_PERIOD_DAYS = 366;

function isDay(value: unknown): value is string {
  return (
    typeof value === "string" &&
    DAY.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  );
}

function daysBetween(from: string, to: string): number {
  return (
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
    86_400_000
  );
}

/**
 * The period in the URL (?from=&to=), or the last 30 days. A reversed or
 * over-long period falls back to the default rather than failing.
 */
export function parsePeriod(
  query: Record<string, string | string[] | undefined>,
  today: string,
): Period {
  const fallback = { from: addDays(today, -29), to: today };
  const { from, to } = query;
  if (!isDay(from) || !isDay(to)) return fallback;
  const length = daysBetween(from, to);
  if (length < 0 || length > MAX_PERIOD_DAYS) return fallback;
  return { from, to };
}

/** Ready-made periods for the filter bar. */
export function periodPresets(
  today: string,
): { label: string; period: Period }[] {
  const [year, month] = today.split("-").map(Number) as [number, number];
  const pad = (n: number) => String(n).padStart(2, "0");
  const monthStart = `${year}-${pad(month)}-01`;
  const lastMonthEnd = addDays(monthStart, -1);
  const lastMonthStart = `${lastMonthEnd.slice(0, 7)}-01`;
  return [
    { label: "آخر 7 أيام", period: { from: addDays(today, -6), to: today } },
    { label: "آخر 30 يوماً", period: { from: addDays(today, -29), to: today } },
    { label: "هذا الشهر", period: { from: monthStart, to: today } },
    {
      label: "الشهر الماضي",
      period: { from: lastMonthStart, to: lastMonthEnd },
    },
  ];
}

/** The query string for a period, keeping other filters. */
export function periodQuery(
  period: Period,
  extra: Record<string, string | undefined> = {},
): string {
  const params = new URLSearchParams({ from: period.from, to: period.to });
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}
