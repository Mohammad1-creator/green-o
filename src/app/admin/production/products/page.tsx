import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductForm } from "@/features/production/components/catalog-forms";
import {
  listProducts,
  listSpecDefinitions,
  routeSummary,
} from "@/features/production/queries";
import { formDefinitions } from "@/features/production/specs";
import { requireManager } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "المنتجات",
};

export default function ProductsPage() {
  return (
    <>
      <PageHeader
        title="المنتجات"
        description="منتجات المصنع ومواصفاتها والمراحل التي يمر بها كل منتج."
      />
      <Suspense fallback={<PageSkeleton />}>
        <Products />
      </Suspense>
    </>
  );
}

async function Products() {
  const viewer = await requireManager();
  const canEdit =
    viewer.role === "general_manager" || viewer.role === "production_manager";
  const [products, definitions] = await Promise.all([
    listProducts(),
    canEdit ? listSpecDefinitions() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      {products.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد منتجات بعد.</p>
      ) : (
        <Table aria-label="المنتجات">
          <TableHeader>
            <TableRow>
              <TableHead>الرمز</TableHead>
              <TableHead>المنتج</TableHead>
              <TableHead>الوحدة</TableHead>
              <TableHead>المسار</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell dir="ltr" className="text-end">
                  {product.code}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/production/products/${product.id}`}
                    className="font-medium hover:underline"
                  >
                    {product.name}
                  </Link>
                  {product.is_active ? null : (
                    <Badge variant="outline" className="ms-2">
                      موقوف
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{product.unit}</TableCell>
                <TableCell className="text-muted-foreground">
                  {product.route.length > 0
                    ? routeSummary(product.route)
                    : "لم يُحدَّد"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {canEdit ? (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>إضافة منتج</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductForm definitions={formDefinitions(definitions)} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
