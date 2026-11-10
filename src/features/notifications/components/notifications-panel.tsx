import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/format";
import { getFactorySettings } from "@/lib/settings";

import { listNotifications } from "../queries";

import { NotificationList } from "./notification-list";
import { PushSettings } from "./push-settings";

/** The notifications page body, shared by the admin panel and the mobile app. */
export async function NotificationsPanel() {
  await requireUser();
  const [items, settings] = await Promise.all([
    listNotifications(),
    getFactorySettings(),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>إشعارات هذا الجهاز</CardTitle>
        </CardHeader>
        <CardContent>
          <PushSettings />
        </CardContent>
      </Card>
      <NotificationList
        items={items.map((item) => ({
          ...item,
          createdLabel: formatDateTime(item.created_at, settings.timeZone),
        }))}
      />
    </div>
  );
}
