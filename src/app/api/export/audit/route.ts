import type { NextRequest } from "next/server";

import { parseAuditFilters } from "@/features/audit/filters";
import {
  actionLabel,
  entryFields,
  fieldLabel,
  tableLabel,
} from "@/features/audit/labels";
import { listAllAuditEntries } from "@/features/audit/queries";
import type { ReportColumn } from "@/features/reports/definitions";
import { attachment, toCsv, toXlsx } from "@/features/reports/export";
import { getCurrentUser } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/format";
import { getFactorySettings } from "@/lib/settings";
import { isTopRole } from "@/lib/auth/roles";

/** The newest entries at most, so one export stays a sensible size. */
const MAX_ROWS = 20_000;

const COLUMNS: ReportColumn[] = [
  { key: "id", label: "الرقم", type: "count" },
  { key: "time", label: "الوقت", type: "text" },
  { key: "actor", label: "الشخص", type: "text" },
  { key: "action", label: "التغيير", type: "text" },
  { key: "table", label: "الجدول", type: "text" },
  { key: "record", label: "رقم السجل", type: "text" },
  { key: "changes", label: "التفاصيل", type: "text" },
  { key: "old_data", label: "القيم قبل", type: "text" },
  { key: "new_data", label: "القيم بعد", type: "text" },
];

/** GET /api/export/audit?from=&to=&actor=&table=&action=&record=&format= */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!isTopRole(user.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const query = Object.fromEntries(request.nextUrl.searchParams);
  const filters = { ...parseAuditFilters(query), beforeId: null };
  const [entries, settings] = await Promise.all([
    listAllAuditEntries(filters, MAX_ROWS),
    getFactorySettings(),
  ]);

  const rows = entries.map((entry) => ({
    id: entry.id,
    time: formatDateTime(entry.occurred_at, settings.timeZone),
    actor: entry.actor_name ?? "النظام",
    action: actionLabel(entry.action),
    table: tableLabel(entry.table_name),
    record: entry.record_id,
    changes: entryFields(entry)
      .map((item) =>
        item.before !== null && item.after !== null
          ? `${fieldLabel(item.field)}: ${item.before} ← ${item.after}`
          : `${fieldLabel(item.field)}: ${item.after ?? item.before}`,
      )
      .join("؛ "),
    old_data: entry.old_data ? JSON.stringify(entry.old_data) : null,
    new_data: entry.new_data ? JSON.stringify(entry.new_data) : null,
  }));
  const headers = { "Cache-Control": "no-store" };
  const baseName =
    `سجل التدقيق ${filters.from ?? ""} ${filters.to ?? ""}`.trim();

  if (query.format === "xlsx") {
    const file = await toXlsx({
      title: "سجل التدقيق",
      columns: COLUMNS,
      rows,
      about: [
        ["التقرير", "سجل التدقيق"],
        ["المصنع", settings.factoryName],
        ["من", filters.from ?? "البداية"],
        ["إلى", filters.to ?? "اليوم"],
        ["عدد الأسطر", String(rows.length)],
        ["أعدّه", user.fullName],
        ["وقت الإعداد", formatDateTime(new Date(), settings.timeZone)],
      ],
    });
    return new Response(new Uint8Array(file), {
      headers: {
        ...headers,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": attachment(`${baseName}.xlsx`, "audit.xlsx"),
      },
    });
  }
  return new Response(toCsv(COLUMNS, rows), {
    headers: {
      ...headers,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": attachment(`${baseName}.csv`, "audit.csv"),
    },
  });
}
