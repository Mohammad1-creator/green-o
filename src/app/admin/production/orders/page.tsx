import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateOrderForm } from "@/features/production/components/order-forms";
import {
  OrderStatusBadge,
  quantityText,
} from "@/features/production/components/order-display";
import {
  isOrderView,
  ORDER_VIEWS,
  orderCode,
  type OrderView,
} from "@/features/production/order-labels";
import {
  listOrderableProducts,
  listOrders,
} from "@/features/production/order-queries";
import { routeSummary } from "@/features/production/queries";
import { getAssignmentOptions } from "@/features/tasks/queries";
import { requireRole } from "@/lib/auth/dal";
import { formatCalendarDate, formatNumber } from "@/lib/format";
import { getFactorySettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { zonedToday } from "@/lib/zoned-time";

export const metadata: Metadata = {
  title: "أوامر الإنتاج",
};

export default function OrdersPage({
  searchParams,
}: PageProps<"/admin/production/orders">) {
  return (
    <>
      <PageHeader
        title="أوامر الإنتاج"
        description="كل أمر يمر بمراحل منتجه بالترتيب، وتعمل المراحل بالتوازي على الكمية السليمة الجاهزة."
      />
      <Suspense fallback={<PageSkeleton />}>
        <Orders searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Orders({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireRole(["general_manager", "production_manager"]);
  const [query, settings] = await Promise.all([
    searchParams,
    getFactorySettings(),
  ]);
  const view: OrderView = isOrderView(query.view) ? query.view : "running";
  const today = zonedToday(settings.timeZone);
  const [orders, products, options] = await Promise.all([
    listOrders(ORDER_VIEWS[view].statuses),
    listOrderableProducts(),
    getAssignmentOptions(viewer),
  ]);

  return (
    <div className="space-y-6">
      <nav aria-label="تصفية الأوامر" className="flex flex-wrap gap-2">
        {(Object.keys(ORDER_VIEWS) as OrderView[]).map((key) => (
          <Link
            key={key}
            href={`/admin/production/orders?view=${key}`}
            aria-current={key === view ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              key === view
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            {ORDER_VIEWS[key].label}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد أوامر هنا.</p>
      ) : (
        <Table aria-label="أوامر الإنتاج">
          <TableHeader>
            <TableRow>
              <TableHead>الأمر</TableHead>
              <TableHead>المنتج</TableHead>
              <TableHead>الكمية</TableHead>
              <TableHead>آخر مرحلة</TableHead>
              <TableHead>التسليم</TableHead>
              <TableHead>الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const last = order.stages.at(-1);
              const late =
                order.due_date !== null &&
                order.due_date < today &&
                (order.status === "open" || order.status === "in_progress");
              return (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      href={`/admin/production/orders/${order.id}`}
                      className="font-medium hover:underline"
                      dir="ltr"
                    >
                      {orderCode(order.number)}
                    </Link>
                  </TableCell>
                  <TableCell>{order.product?.name}</TableCell>
                  <TableCell>
                    {quantityText(order.quantity, order.unit)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {last
                      ? `${last.stage?.name ?? ""}: ${formatNumber(last.good_qty)} سليم`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {order.due_date ? formatCalendarDate(order.due_date) : "—"}
                    {late ? (
                      <span className="ms-2 text-xs font-medium text-destructive">
                        متأخر
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>أمر جديد</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateOrderForm
            products={products.map((product) => ({
              id: product.id,
              code: product.code,
              name: product.name,
              unit: product.unit,
              route: routeSummary(product.route),
            }))}
            departments={options.departments}
            fixedDepartmentId={
              viewer.role === "general_manager" ? null : viewer.departmentId
            }
            today={today}
          />
        </CardContent>
      </Card>
    </div>
  );
}
