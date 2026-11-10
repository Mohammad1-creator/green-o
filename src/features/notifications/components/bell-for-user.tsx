import { getCurrentUser } from "@/lib/auth/dal";

import { countUnreadNotifications } from "../queries";

import { NotificationBell } from "./notification-bell";

export async function BellForCurrentUser({ href }: { href: string }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const unread = await countUnreadNotifications();
  return (
    <NotificationBell userId={user.id} initialUnread={unread} href={href} />
  );
}
