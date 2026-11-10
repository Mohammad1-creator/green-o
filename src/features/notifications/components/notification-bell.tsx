"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { BellIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/browser";

type NotificationRow = { title: string; body: string | null };

/** Bell with the unread count, kept live with Supabase Realtime. */
export function NotificationBell({
  userId,
  initialUnread,
  href,
}: {
  userId: string;
  initialUnread: number;
  href: string;
}) {
  const [unread, setUnread] = useState(initialUnread);

  // When the server sends a fresh count (after any action), take it.
  const [serverCount, setServerCount] = useState(initialUnread);
  if (serverCount !== initialUnread) {
    setServerCount(initialUnread);
    setUnread(initialUnread);
  }

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    async function refreshCount() {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      if (typeof count === "number") setUnread(count);
    }

    async function subscribe() {
      // Realtime checks row level security with this token; without it the
      // channel joins anonymously and receives nothing.
      const { data } = await supabase.auth.getSession();
      await supabase.realtime.setAuth(data.session?.access_token ?? null);
      if (cancelled) return;

      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const row = payload.new as NotificationRow;
            setUnread((count) => count + 1);
            toast(row.title, { description: row.body ?? undefined });
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => void refreshCount(),
        )
        .subscribe();
    }

    void subscribe();
    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId]);

  const label = unread > 0 ? `الإشعارات: ${unread} غير مقروء` : "الإشعارات";

  return (
    <Link
      href={href}
      aria-label={label}
      className="relative inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted"
    >
      <BellIcon className="size-5" aria-hidden />
      {unread > 0 ? (
        <span
          data-testid="unread-count"
          className="absolute -end-0.5 -top-0.5 min-w-5 rounded-full bg-destructive px-1 text-center text-[11px] leading-5 font-bold text-white"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
