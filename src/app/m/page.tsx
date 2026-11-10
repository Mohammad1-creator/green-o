import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/page-skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "الرئيسية",
};

export default function MobileHomePage() {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <MobileHome />
    </Suspense>
  );
}

async function MobileHome() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">مرحباً {user.fullName}</h1>
      <Empty>
        <EmptyHeader>
          <EmptyTitle>لا توجد مهام بعد</EmptyTitle>
          <EmptyDescription>ستظهر هنا المهام المسندة إليك.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
