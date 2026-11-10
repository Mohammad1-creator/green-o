import { Suspense } from "react";

import {
  AdminHeader,
  AdminSidebar,
  HeaderSkeleton,
  SidebarSkeleton,
} from "@/components/admin/admin-chrome";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-svh flex-1">
      <aside className="hidden w-64 shrink-0 border-e bg-sidebar text-sidebar-foreground lg:block">
        <Suspense fallback={<SidebarSkeleton />}>
          <AdminSidebar />
        </Suspense>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<HeaderSkeleton />}>
          <AdminHeader />
        </Suspense>
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
