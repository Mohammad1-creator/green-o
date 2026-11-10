import { type AppRole, MANAGER_ROLES } from "@/lib/auth/roles";

export type NavIcon =
  | "home"
  | "tasks"
  | "approvals"
  | "faults"
  | "machines"
  | "preventive"
  | "orders"
  | "products"
  | "production-settings"
  | "reports"
  | "users"
  | "teams"
  | "departments"
  | "audit"
  | "settings";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  roles: readonly AppRole[];
};

const GM: readonly AppRole[] = ["general_manager"];
const MAINTENANCE: readonly AppRole[] = [
  "general_manager",
  "maintenance_manager",
];

/** Admin sidebar, in display order. Each item lists the roles that see it. */
export const ADMIN_NAV: readonly NavItem[] = [
  { href: "/admin", label: "الرئيسية", icon: "home", roles: MANAGER_ROLES },
  {
    href: "/admin/tasks",
    label: "المهام",
    icon: "tasks",
    roles: MANAGER_ROLES,
  },
  { href: "/admin/teams", label: "الفرق", icon: "teams", roles: MANAGER_ROLES },
  {
    href: "/admin/maintenance/faults",
    label: "بلاغات الأعطال",
    icon: "faults",
    roles: MANAGER_ROLES,
  },
  {
    href: "/admin/maintenance/machines",
    label: "الآلات",
    icon: "machines",
    roles: MAINTENANCE,
  },
  {
    href: "/admin/maintenance/preventive",
    label: "الصيانة الوقائية",
    icon: "preventive",
    roles: MAINTENANCE,
  },
  {
    href: "/admin/users",
    label: "المستخدمون",
    icon: "users",
    roles: MANAGER_ROLES,
  },
  {
    href: "/admin/departments",
    label: "الأقسام",
    icon: "departments",
    roles: GM,
  },
  { href: "/admin/settings", label: "الإعدادات", icon: "settings", roles: GM },
];

export function navItemsFor(role: AppRole): NavItem[] {
  return ADMIN_NAV.filter((item) => item.roles.includes(role));
}
