import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { BellForCurrentUser } from "@/features/notifications/components/bell-for-user";
import { getCurrentUser } from "@/lib/auth/dal";
import { isManagerRole } from "@/lib/auth/roles";
import { getFactorySettings } from "@/lib/settings";

export async function MobileHeader() {
  const [user, settings] = await Promise.all([
    getCurrentUser(),
    getFactorySettings(),
  ]);

  return (
    // Dark green behind the logo (start side) fading to light green, like the logo.
    <header className="sticky top-0 z-30 box-content flex h-14 items-center justify-between gap-3 bg-linear-to-l from-brand-green to-brand-light-green px-4 pt-[env(safe-area-inset-top)] text-white shadow-md">
      <Link href="/m" aria-label={settings.factoryName}>
        <BrandLogo tone="white" height={34} />
      </Link>
      <div className="flex items-center gap-2">
        {user && isManagerRole(user.role) ? (
          <Link
            href="/admin"
            className="text-sm font-medium text-white underline-offset-4 hover:underline"
          >
            لوحة الإدارة
          </Link>
        ) : null}
        <BellForCurrentUser href="/m/notifications" />
      </div>
    </header>
  );
}
