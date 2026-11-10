import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/page-skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  quantityText,
  StageBar,
} from "@/features/production/components/order-display";
import { orderCode } from "@/features/production/order-labels";
import { listMyStages } from "@/features/production/order-queries";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "مراحلي",
};

export default function MyStagesPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <MyStages />
    </Suspense>
  );
}

async function MyStages() {
  const user = await requireUser();
  const stages = await listMyStages(user.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">مراحلي</h1>
      {stages.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>لا توجد مراحل إنتاج مسندة إليك</EmptyTitle>
            <EmptyDescription>
              عندما يسند إليك مدير الإنتاج مرحلة، تظهر هنا.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="space-y-3" aria-label="مراحلي">
          {stages.map((stage) => (
            <li key={stage.id}>
              <Link
                href={`/m/production/${stage.id}`}
                className="block space-y-3 rounded-xl border p-4 active:bg-muted"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{stage.stage?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {stage.order.product?.name} ·{" "}
                      <span dir="ltr">{orderCode(stage.order.number)}</span>
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-xs text-muted-foreground">متاح الآن</p>
                    <p className="text-lg font-semibold">
                      {quantityText(stage.available_qty ?? 0, stage.order.unit)}
                    </p>
                  </div>
                </div>
                <StageBar
                  input={stage.input_qty ?? 0}
                  good={stage.good_qty}
                  defect={stage.defect_qty}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
