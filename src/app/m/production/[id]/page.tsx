import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { PageSkeleton } from "@/components/page-skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LiveOrderRefresh } from "@/features/production/components/live-order-refresh";
import {
  quantityText,
  StageBar,
  StageBarLegend,
} from "@/features/production/components/order-display";
import { RecordEntryForm } from "@/features/production/components/order-forms";
import { isOrderClosed, orderCode } from "@/features/production/order-labels";
import {
  getMyStage,
  listStageDefectTypes,
} from "@/features/production/order-queries";
import { requireUser } from "@/lib/auth/dal";
import { formatDateTime, formatNumber } from "@/lib/format";
import { getFactorySettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "تسجيل الكميات",
};

export default function MyStagePage({
  params,
}: PageProps<"/m/production/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <MyStage params={params} />
    </Suspense>
  );
}

async function MyStage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [result, settings] = await Promise.all([
    getMyStage(id, user.id),
    getFactorySettings(),
  ]);
  if (!result) notFound();
  const { stage, entries } = result;
  const defectTypes = await listStageDefectTypes(stage.stage_id);

  const unit = stage.order.unit;
  const assigned = stage.assignees.some(
    (assignee) => assignee.user_id === user.id,
  );
  const blocked = isOrderClosed(stage.order.status)
    ? "الأمر مغلق، فلا تُسجَّل فيه كميات."
    : stage.status === "closed"
      ? "أُغلقت هذه المرحلة."
      : !assigned
        ? "هذه المرحلة غير مسندة إليك."
        : null;
  const available = stage.available_qty ?? 0;

  return (
    <div className="space-y-5">
      <LiveOrderRefresh orderId={stage.order.id} />
      <div>
        <Link href="/m/production" className="text-sm text-primary">
          العودة إلى مراحلي
        </Link>
        <h1 className="mt-2 text-xl font-bold">{stage.stage?.name}</h1>
        <p className="text-sm text-muted-foreground">
          {stage.order.product?.name} ·{" "}
          <span dir="ltr">{orderCode(stage.order.number)}</span>
        </p>
      </div>

      <section
        aria-label="كميات المرحلة"
        className="space-y-3 rounded-xl border p-4"
      >
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-sm text-muted-foreground">المتاح لك الآن</p>
            <p className="text-3xl font-semibold" data-testid="available-now">
              {quantityText(available, unit)}
            </p>
          </div>
          <p className="text-end text-sm text-muted-foreground">
            من {quantityText(stage.input_qty ?? 0, unit)}
          </p>
        </div>
        <StageBar
          input={stage.input_qty ?? 0}
          good={stage.good_qty}
          defect={stage.defect_qty}
        />
        <StageBarLegend />
        <p className="text-sm">
          سليم {formatNumber(stage.good_qty)} · معيب{" "}
          {formatNumber(stage.defect_qty)}
        </p>
      </section>

      {blocked ? (
        <Alert>
          <AlertDescription>{blocked}</AlertDescription>
        </Alert>
      ) : available <= 0 ? (
        <Alert>
          <AlertDescription>
            لا توجد كمية متاحة الآن. تظهر الكمية هنا عندما تنتهي المرحلة السابقة
            من قطع جديدة.
          </AlertDescription>
        </Alert>
      ) : (
        <RecordEntryForm
          orderId={stage.order.id}
          orderStageId={stage.id}
          defectTypes={defectTypes}
          large
        />
      )}

      <section aria-labelledby="my-entries" className="space-y-2">
        <h2 id="my-entries" className="font-semibold">
          إدخالاتي
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">لم تسجّل شيئاً بعد.</p>
        ) : (
          <ul className="divide-y rounded-xl border text-sm">
            {entries.map((entry) => (
              <li key={entry.id} className="space-y-0.5 p-3">
                <p className={entry.voided_at ? "line-through" : ""}>
                  سليم {formatNumber(entry.good_qty)}
                  {entry.defect_qty > 0
                    ? ` · معيب ${formatNumber(entry.defect_qty)} (${entry.defect?.name ?? ""})`
                    : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(entry.created_at, settings.timeZone)}
                </p>
                {entry.voided_at ? (
                  <p className="text-xs text-destructive">
                    ألغاه المدير: {entry.void_reason}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
