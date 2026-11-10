import "server-only";

import webpush, { WebPushError } from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";

import { buildPushPayload, isGoneStatus } from "./payload";

export type DispatchResult = {
  claimed: number;
  delivered: number;
  failed: number;
  removedDevices: number;
};

let vapidReady = false;

function configureVapid(): boolean {
  if (vapidReady) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidReady = true;
  return true;
}

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT,
  );
}

/**
 * Sends a batch of notifications to every device of their users. The batch
 * is claimed first (marked sent), so concurrent calls never double-send;
 * failures go back to "failed" and the database retries them later.
 */
export async function dispatchPushBatch(
  ids: string[],
): Promise<DispatchResult> {
  const result: DispatchResult = {
    claimed: 0,
    delivered: 0,
    failed: 0,
    removedDevices: 0,
  };
  if (ids.length === 0 || !configureVapid()) return result;

  const admin = createAdminClient();
  const { data: batch, error } = await admin.rpc("claim_push_batch", {
    p_ids: ids,
  });
  if (error) throw error;
  if (!batch || batch.length === 0) return result;
  result.claimed = batch.length;

  const userIds = [...new Set(batch.map((item) => item.user_id))];
  const { data: devices, error: devicesError } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (devicesError) throw devicesError;

  const gone = new Set<string>();
  const reached = new Set<string>();

  await Promise.all(
    batch.map(async (notification) => {
      const payload = buildPushPayload(notification);
      const targets = (devices ?? []).filter(
        (device) => device.user_id === notification.user_id,
      );
      let delivered = false;
      let lastError = "no devices";

      for (const device of targets) {
        try {
          await webpush.sendNotification(
            {
              endpoint: device.endpoint,
              keys: { p256dh: device.p256dh, auth: device.auth },
            },
            payload,
            { TTL: 60 * 60 * 24, urgency: "high" },
          );
          delivered = true;
          reached.add(device.id);
        } catch (sendError) {
          if (sendError instanceof WebPushError) {
            if (isGoneStatus(sendError.statusCode)) gone.add(device.id);
            lastError = `${sendError.statusCode} ${sendError.body ?? ""}`;
          } else {
            lastError = String(sendError);
          }
        }
      }

      if (delivered) {
        result.delivered += 1;
      } else {
        result.failed += 1;
        await admin.rpc("record_push_failure", {
          p_id: notification.id,
          p_error: lastError.slice(0, 500),
        });
      }
    }),
  );

  if (gone.size > 0) {
    await admin
      .from("push_subscriptions")
      .delete()
      .in("id", [...gone]);
    result.removedDevices = gone.size;
  }
  if (reached.size > 0) {
    await admin
      .from("push_subscriptions")
      .update({ last_success_at: new Date().toISOString() })
      .in("id", [...reached]);
  }
  return result;
}
