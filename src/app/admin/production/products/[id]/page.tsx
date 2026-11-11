import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ActiveToggle,
  ProductForm,
  RouteEditor,
} from "@/features/production/components/catalog-forms";
import {
  getProduct,
  listSpecDefinitions,
  listStages,
} from "@/features/production/queries";
import { formDefinitions, formatSpecValue } from "@/features/production/specs";
import { requireManager } from "@/lib/auth/dal";
import { formatNumber } from "@/lib/format";
import { PRODUCTION_ROLES } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "بيانات المنتج",
};

export default function ProductPage({
  params,
  searchParams,
}: PageProps<"/admin/production/products/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Product params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Product({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireManager();
  const canEdit = PRODUCTION_ROLES.includes(viewer.role);
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  const [product, definitions, stages] = await Promise.all([
    getProduct(id),
    listSpecDefinitions(),
    canEdit ? listStages() : Promise.resolve([]),
  ]);
  if (!product) notFound();
  const shown = formDefinitions(definitions, product.specs);

  return (
    <>
      <PageHeader
        title={product.name}
        description={
          <span className="flex items-center gap-2">
            <span dir="ltr">{product.code}</span>
            <span>· الوحدة: {product.unit}</span>
            {product.is_active ? null : <Badge variant="outline">موقوف</Badge>}
          </span>
        }
        actions={
          <Link
            href="/admin/production/products"
            className={buttonVariants({ variant: "outline" })}
          >
            العودة للمنتجات
          </Link>
        }
      />
      {query.created ? (
        <Alert className="mb-6" role="status">
          <AlertDescription>
            أُضيف المنتج. حدّد الآن المراحل التي يمر بها.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>مسار الإنتاج</CardTitle>
            </CardHeader>
            <CardContent>
              {canEdit ? (
                <RouteEditor
                  productId={product.id}
                  stages={stages}
                  initial={product.route.map((step) => step.stage_id)}
                />
              ) : product.route.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  لم يُحدَّد مسار بعد.
                </p>
              ) : (
                <ol className="space-y-2" aria-label="مراحل المسار">
                  {product.route.map((step, index) => (
                    <li key={step.seq} className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-full bg-muted text-sm">
                        {formatNumber(index + 1)}
                      </span>
                      {step.stage?.name}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>المواصفات</CardTitle>
            </CardHeader>
            <CardContent>
              {shown.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  لا توجد مواصفات معرّفة.
                </p>
              ) : (
                <dl className="divide-y text-sm">
                  {shown.map((definition) => (
                    <div
                      key={definition.id}
                      className="flex justify-between gap-4 py-2"
                    >
                      <dt className="text-muted-foreground">
                        {definition.label}
                      </dt>
                      <dd className="font-medium">
                        {formatSpecValue(
                          definition,
                          product.specs[definition.id],
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {product.notes ? (
                <p className="mt-3 text-sm whitespace-pre-line text-muted-foreground">
                  {product.notes}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {canEdit ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>تعديل المنتج</CardTitle>
              </CardHeader>
              <CardContent>
                <ProductForm
                  definitions={shown}
                  defaults={{
                    id: product.id,
                    code: product.code,
                    name: product.name,
                    unit: product.unit,
                    notes: product.notes,
                    specs: product.specs,
                  }}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>حالة المنتج</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {product.is_active
                    ? "المنتج متاح لأوامر الإنتاج الجديدة."
                    : "المنتج موقوف، فلا تُنشأ له أوامر جديدة."}
                </p>
                <ActiveToggle
                  kind="product"
                  id={product.id}
                  isActive={product.is_active}
                  name={product.name}
                />
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </>
  );
}
