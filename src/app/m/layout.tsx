import { Suspense } from "react";

import { BottomNavBar } from "@/components/mobile/bottom-nav";
import { BottomNavForUser } from "@/components/mobile/bottom-nav-for-user";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar";

export default function MobileLayout({ children }: LayoutProps<"/m">) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-lg flex-1 flex-col">
      <Suspense fallback={<div className="h-14 border-b" />}>
        <MobileHeader />
      </Suspense>
      <main className="flex-1 px-4 pt-4 pb-24">{children}</main>
      {/* The bar reads the URL; the fallback is the same bar without the highlight. */}
      <Suspense fallback={<BottomNavBar pathname={null} />}>
        <BottomNavForUser />
      </Suspense>
      <ServiceWorkerRegistrar />
    </div>
  );
}
