import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { type AppRole, MANAGER_ROLES, homePathFor } from "@/lib/auth/roles";
import { readPublicSupabaseConfig } from "@/lib/supabase/public-config";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  fullName: string;
  role: AppRole;
  departmentId: string | null;
  departmentName: string | null;
};

/**
 * The signed-in, active user, read once per request. Null when signed out,
 * deactivated, or without a profile. Reads cookies: call inside <Suspense>.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!readPublicSupabaseConfig()) return null;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, role, department_id, is_active, department:departments(name)",
    )
    .eq("id", userId)
    .maybeSingle();
  if (!profile || !profile.is_active) return null;

  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
    departmentId: profile.department_id,
    departmentName: profile.department?.name ?? null,
  };
});

/** The active user, or a redirect that signs out a session without one. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signout?reason=inactive");
  return user;
}

/** The active user if they hold one of these roles; otherwise back to their home. */
export async function requireRole(
  roles: readonly AppRole[],
): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(homePathFor(user.role));
  return user;
}

export function requireManager(): Promise<CurrentUser> {
  return requireRole(MANAGER_ROLES);
}
