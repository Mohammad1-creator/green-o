/** What the service worker (public/sw.js) receives with each push. */
export type PushPayload = {
  id: string;
  title: string;
  body: string;
  url: string;
};

const DEFAULT_URL = "/m/notifications";

export function buildPushPayload(notification: {
  id: string;
  title: string;
  body: string | null;
  url: string | null;
}): string {
  const payload: PushPayload = {
    id: notification.id,
    title: notification.title,
    body: notification.body ?? "",
    url: notification.url?.startsWith("/") ? notification.url : DEFAULT_URL,
  };
  return JSON.stringify(payload);
}

/** 404 and 410 from a push service mean the device unsubscribed for good. */
export function isGoneStatus(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410;
}

/** Converts the base64url VAPID public key to the bytes PushManager expects. */
export function vapidKeyToBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
