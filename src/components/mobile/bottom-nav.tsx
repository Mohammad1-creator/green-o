"use client";

import {
  FactoryIcon,
  HomeIcon,
  type LucideIcon,
  TriangleAlertIcon,
  UserRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: LucideIcon };

const HOME: Item = { href: "/m", label: "مهامي", icon: HomeIcon };
const PRODUCTION: Item = {
  href: "/m/production",
  label: "الإنتاج",
  icon: FactoryIcon,
};
const FAULTS: Item = {
  href: "/m/faults",
  label: "الأعطال",
  icon: TriangleAlertIcon,
};
const ACCOUNT: Item = {
  href: "/m/account",
  label: "حسابي",
  icon: UserRoundIcon,
};

/** The production tab is only for people with production work. */
function itemsFor(showProduction: boolean): Item[] {
  return showProduction
    ? [HOME, PRODUCTION, FAULTS, ACCOUNT]
    : [HOME, FAULTS, ACCOUNT];
}

function isActive(pathname: string, href: string) {
  return href === "/m" ? pathname === "/m" : pathname.startsWith(href);
}

/** The bar itself; activeHref is null while the current URL is unknown. */
export function BottomNavBar({
  pathname,
  showProduction = false,
}: {
  pathname: string | null;
  showProduction?: boolean;
}) {
  return (
    <nav
      aria-label="التنقل"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-lg">
        {itemsFor(showProduction).map(({ href, label, icon: Icon }) => {
          const active = pathname !== null && isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium " +
                  (active ? "text-primary" : "text-muted-foreground")
                }
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Thumb-friendly navigation that clears the iPhone home indicator. Reads the
 * URL, so the layout renders it inside <Suspense> with BottomNavBar as fallback.
 */
export function BottomNav({
  showProduction = false,
}: {
  showProduction?: boolean;
}) {
  return (
    <BottomNavBar pathname={usePathname()} showProduction={showProduction} />
  );
}
