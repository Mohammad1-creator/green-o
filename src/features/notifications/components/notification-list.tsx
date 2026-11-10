"use client";

import Link from "next/link";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

import { markAllNotificationsRead, markNotificationRead } from "../actions";

export type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  url: string | null;
  read_at: string | null;
  /** Formatted on the server, so server and browser render the same text. */
  createdLabel: string;
};

export function NotificationList({ items }: { items: NotificationItem[] }) {
  const [pending, startTransition] = useTransition();
  const hasUnread = items.some((item) => !item.read_at);

  if (items.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>لا توجد إشعارات</EmptyTitle>
          <EmptyDescription>
            ستظهر هنا المهام الجديدة والتذكيرات والتحديثات.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-3">
      {hasUnread ? (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => void (await markAllNotificationsRead()))
          }
        >
          تعليم الكل كمقروء
        </Button>
      ) : null}

      <ul className="divide-y rounded-xl border" aria-label="الإشعارات">
        {items.map((item) => {
          const unread = !item.read_at;
          const content = (
            <div className="flex gap-3 p-4">
              <span
                aria-hidden
                className={`mt-1.5 size-2 shrink-0 rounded-full ${unread ? "bg-primary" : "bg-transparent"}`}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <p className={unread ? "font-semibold" : "font-medium"}>
                  {item.title}
                  {unread ? (
                    <span className="sr-only"> (غير مقروء)</span>
                  ) : null}
                </p>
                {item.body ? (
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {item.createdLabel}
                </p>
              </div>
            </div>
          );

          return (
            <li key={item.id} className={unread ? "bg-primary/5" : undefined}>
              {item.url ? (
                <Link
                  href={item.url}
                  className="block hover:bg-muted/50"
                  onClick={() => {
                    if (unread) void markNotificationRead(item.id);
                  }}
                >
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
