"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { vapidKeyToBytes } from "@/lib/push/payload";

import {
  removePushSubscription,
  savePushSubscription,
  sendTestNotification,
} from "../actions";

type PushState =
  | "checking"
  | "unsupported"
  | "needs-install"
  | "not-configured"
  | "denied"
  | "off"
  | "on";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInstalled(): boolean {
  const standalone = (navigator as Navigator & { standalone?: boolean })
    .standalone;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    standalone === true
  );
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return registration ? registration.pushManager.getSubscription() : null;
}

async function detectState(): Promise<PushState> {
  if (!("serviceWorker" in navigator) || !("Notification" in window)) {
    return isIos() && !isInstalled() ? "needs-install" : "unsupported";
  }
  if (!("PushManager" in window)) {
    return isIos() && !isInstalled() ? "needs-install" : "unsupported";
  }
  if (!VAPID_PUBLIC_KEY) return "not-configured";
  if (Notification.permission === "denied") return "denied";
  return (await currentSubscription()) ? "on" : "off";
}

const MESSAGES: Record<
  Exclude<PushState, "checking" | "on" | "off">,
  string
> = {
  unsupported:
    "هذا المتصفح لا يدعم الإشعارات. استخدم Chrome على أندرويد أو Safari على آيفون.",
  "needs-install":
    "على آيفون تعمل الإشعارات بعد تثبيت التطبيق: من Safari اضغط «مشاركة» ثم «إضافة إلى الشاشة الرئيسية»، وافتح التطبيق من أيقونته.",
  "not-configured": "الإشعارات غير مفعّلة على الخادم بعد. راجع مسؤول النظام.",
  denied:
    "رفضت الإشعارات لهذا الموقع. فعّلها من إعدادات المتصفح ثم عد إلى هنا.",
};

/** Turns Web Push on or off for this device and sends a test notification. */
export function PushSettings() {
  const [state, setState] = useState<PushState>("checking");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void detectState().then(setState);
  }, []);

  function enable() {
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        await navigator.serviceWorker.ready;
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(permission === "denied" ? "denied" : "off");
          return;
        }
        const subscription =
          (await registration.pushManager.getSubscription()) ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidKeyToBytes(VAPID_PUBLIC_KEY),
          }));
        const json = subscription.toJSON();
        const result = await savePushSubscription({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
          userAgent: navigator.userAgent.slice(0, 500),
        });
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        setState("on");
        toast.success("فُعّلت الإشعارات على هذا الجهاز");
      } catch {
        toast.error("تعذّر تفعيل الإشعارات على هذا الجهاز");
      }
    });
  }

  function disable() {
    startTransition(async () => {
      const subscription = await currentSubscription();
      if (subscription) {
        await removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("off");
    });
  }

  function test() {
    startTransition(async () => {
      const result = await sendTestNotification();
      if (result.ok) toast.success("أُرسل إشعار تجريبي");
      else toast.error(result.message);
    });
  }

  if (state === "checking") {
    return <Spinner className="size-5" />;
  }

  return (
    <div className="space-y-3">
      {state === "on" || state === "off" ? (
        <p className="text-sm text-muted-foreground">
          {state === "on"
            ? "الإشعارات مفعّلة على هذا الجهاز."
            : "فعّل الإشعارات ليصلك كل جديد حتى والتطبيق مغلق."}
        </p>
      ) : (
        <Alert>
          <AlertDescription>{MESSAGES[state]}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        {state === "off" ? (
          <Button onClick={enable} disabled={pending}>
            {pending ? <Spinner /> : null}
            تفعيل الإشعارات
          </Button>
        ) : null}
        {state === "on" ? (
          <Button variant="outline" onClick={disable} disabled={pending}>
            إيقاف الإشعارات على هذا الجهاز
          </Button>
        ) : null}
        <Button variant="outline" onClick={test} disabled={pending}>
          إرسال إشعار تجريبي
        </Button>
      </div>
    </div>
  );
}
