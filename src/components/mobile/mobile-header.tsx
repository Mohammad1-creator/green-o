import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/dal";
import { isManagerRole } from "@/lib/auth/roles";
import { getFactorySettings } from "@/lib/settings";

export async function MobileHeader() {
  const [user, settings] = await Promise.all([
    getCurrentUser(),
    getFactorySettings(),
  ]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur">
      <span className="truncate font-semibold">{settings.factoryName}</span>
      {user && isManagerRole(user.role) ? (
        <Link
          href="/admin"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          لوحة الإدارة
        </Link>
      ) : null}
    </header>
  );
}
