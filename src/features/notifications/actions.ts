"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/dal";
import { toUserMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; message: string };

const NOT_SIGNED_IN: Result = {
  ok: false,
  message: "انتهت الجلسة. سجّل الدخول مرة أخرى.",
};

const subscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://").max(1000),
  p256dh: z.string().min(1).max(200),
  auth: z.string().min(1).max(100),
  userAgent: z.string().max(500).optional(),
});

export async function savePushSubscription(input: unknown): Promise<Result> {
  if (!(await getCurrentUser())) return NOT_SIGNED_IN;
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "بيانات الجهاز غير صالحة" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("register_push_subscription", {
    p_endpoint: parsed.data.endpoint,
    p_p256dh: parsed.data.p256dh,
    p_auth: parsed.data.auth,
    p_user_agent: parsed.data.userAgent,
  });
  return error ? { ok: false, message: toUserMessage(error) } : { ok: true };
}

export async function removePushSubscription(
  endpoint: unknown,
): Promise<Result> {
  if (!(await getCurrentUser())) return NOT_SIGNED_IN;
  const parsed = z.url().safeParse(endpoint);
  if (!parsed.success) return { ok: false, message: "بيانات الجهاز غير صالحة" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", parsed.data);
  return error ? { ok: false, message: toUserMessage(error) } : { ok: true };
}

export async function sendTestNotification(): Promise<Result> {
  if (!(await getCurrentUser())) return NOT_SIGNED_IN;
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_test_notification");
  if (error) return { ok: false, message: toUserMessage(error) };
  revalidatePath("/m/notifications");
  revalidatePath("/admin/notifications");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<Result> {
  if (!(await getCurrentUser())) return NOT_SIGNED_IN;
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_all_notifications_read");
  if (error) return { ok: false, message: toUserMessage(error) };
  revalidatePath("/m/notifications");
  revalidatePath("/admin/notifications");
  return { ok: true };
}

export async function markNotificationRead(id: unknown): Promise<Result> {
  if (!(await getCurrentUser())) return NOT_SIGNED_IN;
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "إشعار غير صالح" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", parsed.data)
    .is("read_at", null);
  return error ? { ok: false, message: toUserMessage(error) } : { ok: true };
}
