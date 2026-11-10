import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/page-skeleton";
import { NotificationsPanel } from "@/features/notifications/components/notifications-panel";

export const metadata: Metadata = {
  title: "الإشعارات",
};

export default function MobileNotificationsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">الإشعارات</h1>
      <Suspense fallback={<PageSkeleton rows={4} />}>
        <NotificationsPanel />
      </Suspense>
    </div>
  );
}
