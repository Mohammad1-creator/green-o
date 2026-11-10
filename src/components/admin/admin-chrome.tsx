import { FactoryIcon } from "lucide-react";
import Link from "next/link";

import { SignOutButton } from "@/components/sign-out-button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth/dal";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { getFactorySettings } from "@/lib/settings";

import { MobileNav } from "./mobile-nav";
import { navItemsFor } from "./nav-items";
import { SidebarNav } from "./sidebar-nav";

export async function AdminSidebar() {
  const [user, settings] = await Promise.all([
    getCurrentUser(),
    getFactorySettings(),
  ]);
  if (!user) return null;

  return (
    <div className="sticky top-0 flex h-svh flex-col gap-6 p-4">
      <Link href="/admin" className="flex items-center gap-2 px-2 font-bold">
        <FactoryIcon className="size-5" aria-hidden />
        {settings.factoryName}
      </Link>
      <SidebarNav items={navItemsFor(user.role)} />
    </div>
  );
}

export async function AdminHeader() {
  const [user, settings] = await Promise.all([
    getCurrentUser(),
    getFactorySettings(),
  ]);
  if (!user) return null;

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b px-4 lg:px-8">
      <div className="flex items-center gap-2">
        <MobileNav
          items={navItemsFor(user.role)}
          title={settings.factoryName}
        />
        <span className="font-semibold lg:hidden">{settings.factoryName}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-end leading-tight">
          <div className="text-sm font-medium">{user.fullName}</div>
          <div className="text-xs text-muted-foreground">
            {ROLE_LABELS[user.role]}
            {user.departmentName ? ` · ${user.departmentName}` : null}
          </div>
        </div>
        <SignOutButton compact />
      </div>
    </header>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

export function HeaderSkeleton() {
  return <div className="h-14 border-b" />;
}
