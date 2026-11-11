import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveOrderRefresh } from "@/features/production/components/live-order-refresh";
import {
  OrderStatusBadge,
  quantityText,
  StageBar,
  StageBarLegend,
  StageStatusBadge,
} from "@/features/production/components/order-display";
import {
  AssignWorkersForm,
  CancelOrderForm,
  CloseStageForm,
  EditOrderForm,
  RecordEntryForm,
  VoidEntryForm,
} from "@/features/production/components/order-forms";
import { isOrderClosed, orderCode } from "@/features/production/order-labels";
import {
  getOrder,
  listDepartmentWorkers,
  listOrderEntries,
  listStageDefectTypes,
} from "@/features/production/order-queries";
import { requireRole } from "@/lib/auth/dal";
import { formatCalendarDate, formatDateTime, formatNumber } from "@/lib/format";
import { getFactorySettings } from "@/lib/settings";
import { PRODUCTION_ROLES } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "أمر إنتاج",
};

export default function OrderPage({
  params,
  searchParams,
}: PageProps<"/admin/production/orders/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Order params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Order({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(PRODUCTION_ROLES);
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  const [order, settings] = await Promise.all([
    getOrder(id),
    getFactorySettings(),
  ]);
  if (!order) notFound();

  const [entries, workers, defectTypes] = await Promise.all([
    listOrderEntries(order.stages.map((stage) => stage.id)),
    listDepartmentWorkers(order.department_id),
    Promise.all(
      order.stages.map((stage) => listStageDefectTypes(stage.stage_id)),
    ),
  ]);
  const closed = isOrderClosed(order.status);
  const unit = order.unit;

  return (
    <>
      <LiveOrderRefresh orderId={order.id} />
      <PageHeader
        title={`أمر الإنتاج ${orderCode(order.number)}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>
              {order.product?.name} · {quantityText(order.quantity, unit)}
              {order.due_date
                ? ` · التسليم ${formatCalendarDate(order.due_date)}`
                : ""}
            </span>
            <OrderStatusBadge status={order.status} />
          </span>
        }
        actions={
          <>
            <Link
              href={`/print/orders/${order.id}`}
              target="_blank"
              className={buttonVariants({ variant: "outline" })}
            >
              طباعة الأمر
            </Link>
            <Link
              href="/admin/production/orders"
              className={buttonVariants({ variant: "outline" })}
            >
              العودة للأوامر
            </Link>
          </>
        }
      />
      {query.created ? (
        <Alert className="mb-6" role="status">
          <AlertDescription>
            أُنشئ الأمر. أسند العمال لكل مرحلة ليبدأ التسجيل.
          </AlertDescription>
        </Alert>
      ) : null}
      {order.status === "cancelled" && order.cancel_reason ? (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            أُلغي الأمر: {order.cancel_reason}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[3fr_1fr]">
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>المراحل</CardTitle>
            <StageBarLegend />
          </CardHeader>
          <CardContent className="space-y-6">
            {order.stages.map((stage, index) => {
              const stageName = stage.stage?.name ?? "—";
              const input = stage.input_qty ?? 0;
              const available = stage.available_qty ?? 0;
              const canWork = !closed && stage.status !== "closed";
              const previousClosed = order.stages
                .slice(0, index)
                .every((earlier) => earlier.status === "closed");
              const stageEntries = entries.filter(
                (entry) => entry.order_stage_id === stage.id,
              );
              const stageWorkers = stage.assignees.map((assignee) => ({
                id: assignee.user_id,
                name: assignee.profile?.full_name ?? "—",
              }));
              return (
                <section
                  key={stage.id}
                  aria-labelledby={`stage-${stage.id}`}
                  className="space-y-3 rounded-lg border p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3
                      id={`stage-${stage.id}`}
                      className="flex items-center gap-2 font-semibold"
                    >
                      {formatNumber(stage.seq)}. {stageName}
                      <StageStatusBadge status={stage.status} />
                    </h3>
                    {canWork && previousClosed ? (
                      <CloseStageForm
                        orderId={order.id}
                        orderStageId={stage.id}
                        stageName={stageName}
                        leftover={
                          available > 0 ? quantityText(available, unit) : null
                        }
                      />
                    ) : null}
                  </div>

                  <StageBar
                    input={input}
                    good={stage.good_qty}
                    defect={stage.defect_qty}
                  />
                  <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <div>
                      <dt className="text-muted-foreground">المدخل</dt>
                      <dd className="font-medium">
                        {quantityText(input, unit)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">سليم</dt>
                      <dd className="font-medium">
                        {quantityText(stage.good_qty, unit)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">معيب</dt>
                      <dd className="font-medium">
                        {quantityText(stage.defect_qty, unit)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">متاح الآن</dt>
                      <dd className="font-medium">
                        {quantityText(available, unit)}
                      </dd>
                    </div>
                  </dl>

                  <p className="text-sm">
                    <span className="text-muted-foreground">العمال: </span>
                    {stageWorkers.length > 0
                      ? stageWorkers.map((worker) => worker.name).join("، ")
                      : "لم يُسند أحد بعد"}
                  </p>

                  {canWork ? (
                    <div className="space-y-3">
                      <details>
                        <summary className="cursor-pointer text-sm text-primary select-none">
                          إسناد العمال
                        </summary>
                        <div className="mt-3">
                          <AssignWorkersForm
                            orderId={order.id}
                            orderStageId={stage.id}
                            stageName={stageName}
                            workers={workers.map((worker) => ({
                              id: worker.id,
                              name: worker.full_name,
                            }))}
                            assigned={stage.assignees.map(
                              (assignee) => assignee.user_id,
                            )}
                          />
                        </div>
                      </details>
                      {stageWorkers.length > 0 ? (
                        <details>
                          <summary className="cursor-pointer text-sm text-primary select-none">
                            تسجيل كمية نيابة عن عامل
                          </summary>
                          <div className="mt-3 max-w-md">
                            <RecordEntryForm
                              orderId={order.id}
                              orderStageId={stage.id}
                              defectTypes={defectTypes[index] ?? []}
                              workers={stageWorkers}
                            />
                          </div>
                        </details>
                      ) : null}
                    </div>
                  ) : null}

                  {stageEntries.length > 0 ? (
                    <ul
                      className="divide-y text-sm"
                      aria-label={`إدخالات ${stageName}`}
                    >
                      {stageEntries.map((entry) => (
                        <li
                          key={entry.id}
                          className="flex flex-wrap items-start justify-between gap-2 py-2"
                        >
                          <div
                            className={
                              entry.voided_at
                                ? "text-muted-foreground"
                                : undefined
                            }
                          >
                            <p
                              className={entry.voided_at ? "line-through" : ""}
                            >
                              {entry.worker?.full_name}: سليم{" "}
                              {formatNumber(entry.good_qty)}
                              {entry.defect_qty > 0
                                ? ` · معيب ${formatNumber(entry.defect_qty)} (${entry.defect?.name ?? ""})`
                                : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(
                                entry.created_at,
                                settings.timeZone,
                              )}
                              {entry.recorder &&
                              entry.recorder.full_name !==
                                entry.worker?.full_name
                                ? ` · سجّله ${entry.recorder.full_name}`
                                : ""}
                              {entry.note ? ` · ${entry.note}` : ""}
                            </p>
                            {entry.voided_at ? (
                              <p className="text-xs">
                                أُلغي: {entry.void_reason}
                              </p>
                            ) : null}
                          </div>
                          {canWork && !entry.voided_at ? (
                            <VoidEntryForm
                              orderId={order.id}
                              entryId={entry.id}
                            />
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              );
            })}
          </CardContent>
        </Card>

        {closed ? null : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>بيانات الأمر</CardTitle>
              </CardHeader>
              <CardContent>
                <EditOrderForm
                  orderId={order.id}
                  unit={unit}
                  defaults={{
                    quantity: order.quantity,
                    dueDate: order.due_date,
                    notes: order.notes,
                  }}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>إلغاء الأمر</CardTitle>
              </CardHeader>
              <CardContent>
                <CancelOrderForm orderId={order.id} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
