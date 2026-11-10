import type { NextRequest } from "next/server";
import { z } from "zod";

import {
  canSeeReport,
  isReportKey,
  REPORTS,
} from "@/features/reports/definitions";
import { attachment, toCsv, toXlsx } from "@/features/reports/export";
import { parsePeriod } from "@/features/reports/period";
import { getCurrentUser } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/format";
import { getFactorySettings } from "@/lib/settings";
import { zonedToday } from "@/lib/zoned-time";

/**
 * GET /api/export/<report>?from=&to=&department=&format=csv|xlsx
 * Runs the report with the signed-in user's own permissions.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/export/[report]">,
) {
  const { report } = await context.params;
  if (!isReportKey(report)) return new Response("Not found", { status: 404 });

  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!canSeeReport(user.role, report)) {
    return new Response("Forbidden", { status: 403 });
  }

  const settings = await getFactorySettings();
  const query = Object.fromEntries(request.nextUrl.searchParams);
  const period = parsePeriod(query, zonedToday(settings.timeZone));
  const departmentParam = z.uuid().safeParse(query.department);
  const departmentId =
    user.role === "general_manager" && departmentParam.success
      ? departmentParam.data
      : null;

  const definition = REPORTS[report];
  const rows = await definition.fetch({ period, departmentId });
  const baseName = `${definition.title} ${period.from} ${period.to}`;
  const headers = { "Cache-Control": "no-store" };

  if (query.format === "xlsx") {
    const file = await toXlsx({
      title: definition.title,
      columns: definition.columns,
      rows,
      about: [
        ["التقرير", definition.title],
        ["المصنع", settings.factoryName],
        ["من", period.from],
        ["إلى", period.to],
        ["أعدّه", user.fullName],
        ["وقت الإعداد", formatDateTime(new Date(), settings.timeZone)],
      ],
    });
    return new Response(new Uint8Array(file), {
      headers: {
        ...headers,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": attachment(`${baseName}.xlsx`, `${report}.xlsx`),
      },
    });
  }

  return new Response(toCsv(definition.columns, rows), {
    headers: {
      ...headers,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": attachment(`${baseName}.csv`, `${report}.csv`),
    },
  });
}
