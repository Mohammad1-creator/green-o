import "server-only";

import ExcelJS from "exceljs";

import type { ReportColumn, ReportRow } from "./definitions";

/** Excel needs the byte order mark to read UTF-8 Arabic correctly. */
const BOM = "﻿";

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function csvValue(column: ReportColumn, value: ReportRow[string]): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    if (column.type === "percent") return `${round(value * 100, 1)}%`;
    if (column.type === "hours") return String(round(value, 1));
    return String(value);
  }
  return value;
}

function csvCell(text: string): string {
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** A CSV file (UTF-8 with BOM, CRLF line ends) that Excel opens as is. */
export function toCsv(columns: ReportColumn[], rows: ReportRow[]): string {
  const lines = [
    columns.map((column) => csvCell(column.label)).join(","),
    ...rows.map((row) =>
      columns
        .map((column) => csvCell(csvValue(column, row[column.key] ?? null)))
        .join(","),
    ),
  ];
  return BOM + lines.join("\r\n") + "\r\n";
}

const NUMBER_FORMATS: Partial<Record<ReportColumn["type"], string>> = {
  count: "#,##0",
  quantity: "#,##0.###",
  hours: "#,##0.0",
  percent: "0.0%",
};

/** A right-to-left workbook: the data sheet, then a sheet about the report. */
export async function toXlsx(input: {
  title: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  about: [string, string][];
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(input.title.slice(0, 31), {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });
  sheet.columns = input.columns.map((column) => ({
    header: column.label,
    key: column.key,
    width: column.type === "text" ? 28 : 16,
    style: NUMBER_FORMATS[column.type]
      ? { numFmt: NUMBER_FORMATS[column.type] }
      : {},
  }));
  sheet.getRow(1).font = { bold: true };
  for (const row of input.rows) {
    sheet.addRow(
      Object.fromEntries(
        input.columns.map((column) => [column.key, row[column.key] ?? null]),
      ),
    );
  }

  const about = workbook.addWorksheet("عن التقرير", {
    views: [{ rightToLeft: true }],
  });
  about.columns = [{ width: 22 }, { width: 40 }];
  for (const line of input.about) about.addRow(line);
  about.getColumn(1).font = { bold: true };

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/** Content-Disposition for a file name that may be Arabic. */
export function attachment(fileName: string, fallback: string): string {
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
