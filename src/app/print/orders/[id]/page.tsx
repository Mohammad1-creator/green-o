import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { PageSkeleton } from "@/components/page-skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { quantityText } from "@/features/production/components/order-display";
import {
  ORDER_STAGE_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  orderCode,
} from "@/features/production/order-labels";
import {
  getOrder,
  listOrderEntries,
} from "@/features/production/order-queries";
import { PrintButton } from "@/features/reports/components/print-button";
import { requireRole } from "@/lib/auth/dal";
import { formatCalendarDate, formatDateTime, formatNumber } from "@/lib/format";
import { getFactorySettings } from "@/lib/settings";
import { PRODUCTION_ROLES } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "أمر إنتاج للطباعة",
};

export default function PrintOrderPage({
  params,
}: PageProps<"/print/orders/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PrintOrder params={params} />
    </Suspense>
  );
}

async function PrintOrder({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(PRODUCTION_ROLES);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [order, settings] = await Promise.all([
    getOrder(id),
    getFactorySettings(),
  ]);
  if (!order) notFound();
  const entries = await listOrderEntries(order.stages.map((stage) => stage.id));
  const stageName = new Map(
    order.stages.map((stage) => [stage.id, stage.stage?.name ?? "—"]),
  );
  const unit = order.unit;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">
            أمر الإنتاج <span dir="ltr">{orderCode(order.number)}</span>
          </h1>
          <p>
            {order.product?.name} · {quantityText(order.quantity, unit)} ·{" "}
            {ORDER_STATUS_LABELS[order.status]}
          </p>
          <p className="text-sm text-muted-foreground">
            أُنشئ {formatDateTime(order.created_at, settings.timeZone)}
            {order.due_date
              ? ` · التسليم ${formatCalendarDate(order.due_date)}`
              : ""}
            {order.completed_at
              ? ` · اكتمل ${formatDateTime(order.completed_at, settings.timeZone)}`
              : ""}
          </p>
          {order.notes ? <p className="text-sm">{order.notes}</p> : null}
        </div>
        <PrintButton />
      </header>

      <section className="space-y-2">
        <h2 className="font-semibold">المراحل</h2>
        <Table aria-label="المراحل">
          <TableHeader>
            <TableRow>
              <TableHead>المرحلة</TableHead>
              <TableHead className="text-end">المدخل</TableHead>
              <TableHead className="text-end">سليم</TableHead>
              <TableHead className="text-end">معيب</TableHead>
              <TableHead className="text-end">لم يُسجَّل</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>العمال</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.stages.map((stage) => (
              <TableRow key={stage.id}>
                <TableCell>
                  {formatNumber(stage.seq)}. {stage.stage?.name}
                </TableCell>
                <TableCell className="text-end tabular-nums">
                  {formatNumber(stage.input_qty ?? 0)}
                </TableCell>
                <TableCell className="text-end tabular-nums">
                  {formatNumber(stage.good_qty)}
                </TableCell>
                <TableCell className="text-end tabular-nums">
                  {formatNumber(stage.defect_qty)}
                </TableCell>
                <TableCell className="text-end tabular-nums">
                  {formatNumber(stage.available_qty ?? 0)}
                </TableCell>
                <TableCell>{ORDER_STAGE_STATUS_LABELS[stage.status]}</TableCell>
                <TableCell>
                  {stage.assignees
                    .map((assignee) => assignee.profile?.full_name)
                    .filter(Boolean)
                    .join("، ") || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">الإدخالات</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد إدخالات.</p>
        ) : (
          <Table aria-label="الإدخالات">
            <TableHeader>
              <TableRow>
                <TableHead>الوقت</TableHead>
                <TableHead>المرحلة</TableHead>
                <TableHead>العامل</TableHead>
                <TableHead className="text-end">سليم</TableHead>
                <TableHead className="text-end">معيب</TableHead>
                <TableHead>نوع العيب</TableHead>
                <TableHead>ملاحظة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...entries].reverse().map((entry) => (
                <TableRow
                  key={entry.id}
                  className={
                    entry.voided_at
                      ? "text-muted-foreground line-through"
                      : undefined
                  }
                >
                  <TableCell>
                    {formatDateTime(entry.created_at, settings.timeZone)}
                  </TableCell>
                  <TableCell>{stageName.get(entry.order_stage_id)}</TableCell>
                  <TableCell>{entry.worker?.full_name}</TableCell>
                  <TableCell className="text-end tabular-nums">
                    {formatNumber(entry.good_qty)}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {formatNumber(entry.defect_qty)}
                  </TableCell>
                  <TableCell>{entry.defect?.name ?? "—"}</TableCell>
                  <TableCell>
                    {entry.voided_at
                      ? `ملغى: ${entry.void_reason}`
                      : (entry.note ?? "")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
