import { Suspense } from "react";

import { BottomNav } from "@/components/mobile/bottom-nav";
import { MobileHeader } from "@/components/mobile/mobile-header";

export default function MobileLayout({ children }: LayoutProps<"/m">) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-lg flex-1 flex-col">
      <Suspense fallback={<div className="h-14 border-b" />}>
        <MobileHeader />
      </Suspense>
      <main className="flex-1 px-4 pt-4 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
