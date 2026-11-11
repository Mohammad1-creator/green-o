"use client";

import {
  BarChart3Icon,
  BoxesIcon,
  Building2Icon,
  CalendarClockIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  CogIcon,
  FactoryIcon,
  HomeIcon,
  type LucideIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  TrophyIcon,
  TriangleAlertIcon,
  UsersIcon,
  UsersRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavIcon, NavItem } from "./nav-items";

const ICONS: Record<NavIcon, LucideIcon> = {
  home: HomeIcon,
  tasks: ClipboardListIcon,
  approvals: ClipboardCheckIcon,
  faults: TriangleAlertIcon,
  machines: CogIcon,
  preventive: CalendarClockIcon,
  orders: FactoryIcon,
  products: BoxesIcon,
  "production-settings": SlidersHorizontalIcon,
  reports: BarChart3Icon,
  points: TrophyIcon,
  users: UsersIcon,
  teams: UsersRoundIcon,
  departments: Building2Icon,
  audit: ScrollTextIcon,
  settings: SettingsIcon,
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="القائمة الرئيسية" className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = ICONS[item.icon] ?? ShieldCheckIcon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
              (active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")
            }
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
