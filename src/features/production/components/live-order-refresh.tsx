"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { createClient } from "@/lib/supabase/browser";

/**
 * Re-renders the page when any stage of the order changes, so the
 * "available now" figures follow what other workers record.
 */
export function LiveOrderRefresh({ orderId }: { orderId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function subscribe() {
      // Realtime applies row level security with this token.
      const { data } = await supabase.auth.getSession();
      await supabase.realtime.setAuth(data.session?.access_token ?? null);
      if (cancelled) return;
      channel = supabase
        .channel(`order-stages:${orderId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "order_stages",
            filter: `order_id=eq.${orderId}`,
          },
          () => {
            clearTimeout(timer);
            timer = setTimeout(() => router.refresh(), 300);
          },
        )
        .subscribe();
    }
    void subscribe();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [orderId, router]);

  return null;
}
