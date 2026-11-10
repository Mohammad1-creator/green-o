import type { AppRole } from "./roles";

type Viewer = { role: AppRole; departmentId: string | null };

/**
 * Mirrors private.manages_department() for showing or hiding controls.
 * The database still decides; this only avoids offering buttons that fail.
 */
export function managesDepartment(
  viewer: Viewer,
  departmentId: string | null,
): boolean {
  if (viewer.role === "general_manager") return true;
  return (
    viewer.role !== "employee" &&
    departmentId !== null &&
    viewer.departmentId === departmentId
  );
}
