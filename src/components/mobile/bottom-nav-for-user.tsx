import { hasProductionWork } from "@/features/production/order-queries";
import { hasViolations } from "@/features/safety/queries";
import { getCurrentUser } from "@/lib/auth/dal";
import { canRecordViolations } from "@/lib/auth/roles";

import { BottomNav } from "./bottom-nav";

/** The bottom bar, with the production and safety tabs for people who need them. */
export async function BottomNavForUser() {
  const user = await getCurrentUser();
  if (!user) return <BottomNav />;
  const [showProduction, showSafety] = await Promise.all([
    user.role === "production_manager"
      ? Promise.resolve(true)
      : hasProductionWork(user.id),
    canRecordViolations(user.role)
      ? Promise.resolve(true)
      : hasViolations(user.id),
  ]);
  return <BottomNav showProduction={showProduction} showSafety={showSafety} />;
}
