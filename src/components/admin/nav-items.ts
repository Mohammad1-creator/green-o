import {
  type AppRole,
  MAINTENANCE_ROLES,
  MANAGER_ROLES,
  PRODUCTION_ROLES,
  TOP_ROLES,
} from "@/lib/auth/roles";

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
  | "points"
  | "users"
  | "permissions"
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

const GM = TOP_ROLES;
const MAINTENANCE = MAINTENANCE_ROLES;
const PRODUCTION = PRODUCTION_ROLES;

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
    href: "/admin/production/orders",
    label: "أوامر الإنتاج",
    icon: "orders",
    roles: PRODUCTION,
  },
  {
    href: "/admin/production/products",
    label: "المنتجات",
    icon: "products",
    roles: MANAGER_ROLES,
  },
  {
    href: "/admin/production/settings",
    label: "إعدادات الإنتاج",
    icon: "production-settings",
    roles: PRODUCTION,
  },
  {
    href: "/admin/reports",
    label: "التقارير",
    icon: "reports",
    roles: MANAGER_ROLES,
  },
  {
    href: "/admin/points",
    label: "النقاط",
    icon: "points",
    roles: MANAGER_ROLES,
  },
  {
    href: "/admin/users",
    label: "المستخدمون",
    icon: "users",
    roles: MANAGER_ROLES,
  },
  {
    href: "/admin/permissions",
    label: "الصلاحيات",
    icon: "permissions",
    roles: GM,
  },
  {
    href: "/admin/departments",
    label: "الأقسام",
    icon: "departments",
    roles: GM,
  },
  { href: "/admin/audit", label: "سجل التدقيق", icon: "audit", roles: GM },
  { href: "/admin/settings", label: "الإعدادات", icon: "settings", roles: GM },
];

export function navItemsFor(role: AppRole): NavItem[] {
  return ADMIN_NAV.filter((item) => item.roles.includes(role));
}
