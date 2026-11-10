import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { navItemsFor } from "@/components/admin/nav-items";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { requireManager } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "الرئيسية",
};

export default function AdminHomePage() {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <AdminHome />
    </Suspense>
  );
}

async function AdminHome() {
  const user = await requireManager();
  const shortcuts = navItemsFor(user.role).filter(
    (item) => item.href !== "/admin",
  );

  return (
    <>
      <PageHeader
        title={`مرحباً ${user.fullName}`}
        description="اختر ما تريد العمل عليه."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shortcuts.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl focus-visible:outline-2"
          >
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle>{item.label}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
