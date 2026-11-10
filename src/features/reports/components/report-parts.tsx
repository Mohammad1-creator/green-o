import Link from "next/link";

import { StatTile } from "@/components/stat-tile";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCalendarDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { ReportColumn, ReportKey, ReportRow } from "../definitions";
import { formatCell } from "../format-cell";
import { type Period, periodPresets, periodQuery } from "../period";

/** The period (and, for the general manager, department) filter. */
export function PeriodFilter({
  action,
  period,
  today,
  departments,
  departmentId,
}: {
  action: string;
  period: Period;
  today: string;
  departments?: { id: string; name: string }[];
  departmentId: string | null;
}) {
  return (
    <div className="space-y-3 rounded-xl border p-4 print:hidden">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">من</span>
          <input
            type="date"
            name="from"
            defaultValue={period.from}
            max={today}
            dir="ltr"
            className="h-9 rounded-md border bg-transparent px-2 text-start"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">إلى</span>
          <input
            type="date"
            name="to"
            defaultValue={period.to}
            max={today}
            dir="ltr"
            className="h-9 rounded-md border bg-transparent px-2 text-start"
          />
        </label>
        {departments ? (
          <label className="grid gap-1 text-sm">
            <span className="font-medium">القسم (للمهام)</span>
            <select
              name="department"
              defaultValue={departmentId ?? ""}
              className="h-9 rounded-md border bg-transparent px-2"
            >
              <option value="">كل الأقسام</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button type="submit" className={buttonVariants()}>
          عرض
        </button>
      </form>
      <nav aria-label="فترات جاهزة" className="flex flex-wrap gap-2">
        {periodPresets(today).map((preset) => {
          const active =
            preset.period.from === period.from &&
            preset.period.to === period.to;
          return (
            <Link
              key={preset.label}
              href={`${action}?${periodQuery(preset.period, {
                department: departmentId ?? undefined,
              })}`}
              aria-current={active ? "true" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-xs",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              )}
            >
              {preset.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function periodLabel(period: Period): string {
  return `من ${formatCalendarDate(period.from)} إلى ${formatCalendarDate(period.to)}`;
}

export function KpiRow({
  label,
  tiles,
}: {
  label: string;
  tiles: { label: string; value: string; hint?: string }[];
}) {
  return (
    <dl
      aria-label={label}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4"
    >
      {tiles.map((tile) => (
        <StatTile key={tile.label} {...tile} />
      ))}
    </dl>
  );
}

/** One report table, with its CSV and Excel downloads. */
export function ReportTable({
  report,
  title,
  columns,
  rows,
  exportQuery,
}: {
  report: ReportKey;
  title: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  /** Null on the print page. */
  exportQuery: string | null;
}) {
  return (
    <section aria-label={title} className="break-inside-avoid space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        {exportQuery !== null && rows.length > 0 ? (
          <div className="flex gap-2 print:hidden">
            <a
              href={`/api/export/${report}?${exportQuery}&format=xlsx`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Excel
            </a>
            <a
              href={`/api/export/${report}?${exportQuery}&format=csv`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              CSV
            </a>
          </div>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          لا توجد بيانات في هذه الفترة.
        </p>
      ) : (
        <Table aria-label={title}>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={column.type === "text" ? undefined : "text-end"}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={
                      column.type === "text"
                        ? undefined
                        : "text-end tabular-nums"
                    }
                  >
                    {formatCell(column.type, row[column.key])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

/**
 * Ranked horizontal bars in one hue, largest first, each with its value
 * printed; the table beside it holds the full figures.
 */
export function RankedBars({
  label,
  items,
}: {
  label: string;
  items: { label: string; value: number; display: string }[];
}) {
  const top = [...items].sort((a, b) => b.value - a.value).slice(0, 8);
  const max = Math.max(...top.map((item) => item.value), 0);
  if (top.length === 0 || max <= 0) return null;
  return (
    <figure className="break-inside-avoid space-y-2">
      <figcaption className="text-sm font-medium">{label}</figcaption>
      <ul className="space-y-2">
        {top.map((item) => (
          <li
            key={item.label}
            title={`${item.label}: ${item.display}`}
            className="grid grid-cols-[minmax(6rem,10rem)_1fr_auto] items-center gap-3 text-sm"
          >
            <span className="truncate">{item.label}</span>
            <span aria-hidden className="h-2 rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </span>
            <span className="tabular-nums">{item.display}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
