import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { NotificationsPanel } from "@/features/notifications/components/notifications-panel";

export const metadata: Metadata = {
  title: "الإشعارات",
};

export default function AdminNotificationsPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="الإشعارات" />
      <Suspense fallback={<PageSkeleton rows={4} />}>
        <NotificationsPanel />
      </Suspense>
    </div>
  );
}
