"use client";

import { HomeIcon, type LucideIcon, UserRoundIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: LucideIcon };

const ITEMS: Item[] = [
  { href: "/m", label: "الرئيسية", icon: HomeIcon },
  { href: "/m/account", label: "حسابي", icon: UserRoundIcon },
];

function isActive(pathname: string, href: string) {
  return href === "/m" ? pathname === "/m" : pathname.startsWith(href);
}

/** Thumb-friendly navigation that clears the iPhone home indicator. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="التنقل"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-lg">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
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
