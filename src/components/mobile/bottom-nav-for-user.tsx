import { hasProductionWork } from "@/features/production/order-queries";
import { getCurrentUser } from "@/lib/auth/dal";

import { BottomNav } from "./bottom-nav";

/** The bottom bar, with the production tab for people who need it. */
export async function BottomNavForUser() {
  const user = await getCurrentUser();
  const showProduction = user
    ? user.role === "production_manager" || (await hasProductionWork(user.id))
    : false;
  return <BottomNav showProduction={showProduction} />;
}
