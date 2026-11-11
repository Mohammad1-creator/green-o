export const APP_ROLES = [
  "developer",
  "general_manager",
  "maintenance_manager",
  "production_manager",
  "employee",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  developer: "المبرمج",
  general_manager: "المدير العام",
  maintenance_manager: "مدير الصيانة",
  production_manager: "مدير الإنتاج",
  employee: "موظف",
};

export const MANAGER_ROLES: readonly AppRole[] = [
  "developer",
  "general_manager",
  "maintenance_manager",
  "production_manager",
];

/**
 * Factory-wide roles: no department, every department in scope. The
 * developer can do everything the general manager can, and more.
 */
export const TOP_ROLES: readonly AppRole[] = ["developer", "general_manager"];
export const MAINTENANCE_ROLES: readonly AppRole[] = [
  ...TOP_ROLES,
  "maintenance_manager",
];
export const PRODUCTION_ROLES: readonly AppRole[] = [
  ...TOP_ROLES,
  "production_manager",
];

export function isTopRole(role: AppRole | null | undefined): boolean {
  return role === "developer" || role === "general_manager";
}

/** Assigning repairs: the maintenance manager, and the developer. */
export function canDecideFaults(role: AppRole): boolean {
  return role === "maintenance_manager" || role === "developer";
}

export function isAppRole(value: unknown): value is AppRole {
  return APP_ROLES.some((role) => role === value);
}

export function isManagerRole(role: AppRole): boolean {
  return MANAGER_ROLES.includes(role);
}

/** Managers start in the admin panel, employees in the mobile app. */
export function homePathFor(role: AppRole): "/admin" | "/m" {
  return isManagerRole(role) ? "/admin" : "/m";
}

/**
 * Accepts a "next" path only if it stays on this site, so a crafted login
 * link cannot redirect the user elsewhere.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\")
  ) {
    return null;
  }
  if (
    next === "/login" ||
    next.startsWith("/login?") ||
    next.startsWith("/auth/")
  ) {
    return null;
  }
  return next;
}
