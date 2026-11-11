import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChainCheckForm } from "@/features/audit/components/chain-check-form";
import { auditQuery, parseAuditFilters } from "@/features/audit/filters";
import {
  ACTION_LABELS,
  actionLabel,
  entryFields,
  fieldLabel,
  tableLabel,
} from "@/features/audit/labels";
import {
  getChainStatus,
  listAuditEntries,
  listAuditTables,
  listPeople,
} from "@/features/audit/queries";
import { requireRole } from "@/lib/auth/dal";
import { formatDateTime, formatNumber } from "@/lib/format";
import { getFactorySettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "سجل التدقيق",
};

const PAGE_SIZE = 50;

export default function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  return (
    <>
      <PageHeader
        title="سجل التدقيق"
        description="كل إنشاء وتعديل وحذف في النظام: من قام به، ومتى، والقيم قبل التغيير وبعده. لا يمكن تعديل السجل أو حذفه."
      />
      <Suspense fallback={<PageSkeleton />}>
        <Audit searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Audit({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["general_manager"]);
  const [query, settings] = await Promise.all([
    searchParams,
    getFactorySettings(),
  ]);
  const filters = parseAuditFilters(query);
  const [entries, status, tables, people] = await Promise.all([
    listAuditEntries(filters, PAGE_SIZE),
    getChainStatus(),
    listAuditTables(),
    listPeople(),
  ]);
  const base = auditQuery(filters);
  const oldest = entries.at(-1);
  const select = "h-9 w-full rounded-md border bg-transparent px-2 text-sm";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>سلامة السجل</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {status === null ? (
            <p className="text-muted-foreground">لم يُفحص السجل بعد.</p>
          ) : status.ok ? (
            <p>
              آخر فحص في {formatDateTime(status.checked_at, settings.timeZone)}:
              السلسلة سليمة (عدد الأسطر المفحوصة:{" "}
              {formatNumber(status.checked_rows)}).
            </p>
          ) : (
            <Alert variant="destructive">
              <AlertDescription>
                آخر فحص في{" "}
                {formatDateTime(status.checked_at, settings.timeZone)} وجد خللاً
                عند السطر {status.first_bad_id}: {status.problem}
              </AlertDescription>
            </Alert>
          )}
          <p className="text-muted-foreground">
            يُفحص السجل تلقائياً كل ليلة: كل سطر يحمل بصمة السطر الذي قبله، فأي
            تعديل أو حذف يظهر هنا.
          </p>
          <ChainCheckForm />
        </CardContent>
      </Card>

      <form
        action="/admin/audit"
        className="grid gap-3 rounded-xl border p-4 sm:grid-cols-3 lg:grid-cols-6"
      >
        <label className="grid gap-1 text-sm">
          <span className="font-medium">من</span>
          <input
            type="date"
            name="from"
            defaultValue={filters.from ?? ""}
            dir="ltr"
            className={select}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">إلى</span>
          <input
            type="date"
            name="to"
            defaultValue={filters.to ?? ""}
            dir="ltr"
            className={select}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">الشخص</span>
          <select
            name="actor"
            defaultValue={filters.actorId ?? ""}
            className={select}
          >
            <option value="">الكل</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">الجدول</span>
          <select
            name="table"
            defaultValue={filters.table ?? ""}
            className={select}
          >
            <option value="">الكل</option>
            {tables.map((table) => (
              <option key={table.table_name} value={table.table_name}>
                {tableLabel(table.table_name)} ({formatNumber(table.entries)})
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">نوع التغيير</span>
          <select
            name="action"
            defaultValue={filters.action ?? ""}
            className={select}
          >
            <option value="">الكل</option>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">رقم السجل (اختياري)</span>
          <input
            name="record"
            defaultValue={filters.recordId ?? ""}
            dir="ltr"
            className={select}
          />
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-3 lg:col-span-6">
          <button type="submit" className={buttonVariants()}>
            بحث
          </button>
          <Link
            href="/admin/audit"
            className={buttonVariants({ variant: "outline" })}
          >
            مسح
          </Link>
          <a
            href={`/api/export/audit?${base}&format=xlsx`}
            className={buttonVariants({ variant: "outline" })}
          >
            تصدير Excel
          </a>
          <a
            href={`/api/export/audit?${base}&format=csv`}
            className={buttonVariants({ variant: "outline" })}
          >
            تصدير CSV
          </a>
        </div>
      </form>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد سجلات مطابقة.</p>
      ) : (
        <ol className="divide-y rounded-xl border" aria-label="سجلات التدقيق">
          {entries.map((entry) => {
            const fields = entryFields(entry);
            return (
              <li key={entry.id} className="space-y-2 p-4 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p>
                    <span className="font-medium">
                      {entry.actor_name ?? "النظام"}
                    </span>{" "}
                    · {actionLabel(entry.action)} في{" "}
                    <span className="font-medium">
                      {tableLabel(entry.table_name)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(entry.occurred_at, settings.timeZone)} · #
                    {entry.id}
                  </p>
                </div>
                {fields.length > 0 ? (
                  <details>
                    <summary className="cursor-pointer text-xs text-primary select-none">
                      التفاصيل ({formatNumber(fields.length)})
                    </summary>
                    <dl className="mt-2 grid gap-1">
                      {fields.map((item) => (
                        <div
                          key={item.field}
                          className="grid gap-2 sm:grid-cols-[10rem_1fr]"
                        >
                          <dt className="text-muted-foreground">
                            {fieldLabel(item.field)}
                          </dt>
                          <dd className="break-words">
                            {item.before !== null && item.after !== null ? (
                              <>
                                <span className="text-muted-foreground line-through">
                                  {item.before}
                                </span>{" "}
                                ← {item.after}
                              </>
                            ) : (
                              (item.after ?? item.before)
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                ) : null}
                {entry.record_id ? (
                  <p className="text-xs text-muted-foreground" dir="ltr">
                    {entry.record_id}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      <nav aria-label="صفحات السجل" className="flex gap-2">
        {filters.beforeId ? (
          <Link
            href={`/admin/audit?${base}`}
            className={buttonVariants({ variant: "outline" })}
          >
            الأحدث
          </Link>
        ) : null}
        {entries.length === PAGE_SIZE && oldest ? (
          <Link
            href={`/admin/audit?${base}${base ? "&" : ""}before=${oldest.id}`}
            className={buttonVariants({ variant: "outline" })}
          >
            الأقدم
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
