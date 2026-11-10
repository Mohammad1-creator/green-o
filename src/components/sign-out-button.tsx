import { LogOutIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/** A plain form post, so signing out works even before JavaScript loads. */
export function SignOutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action="/auth/signout" method="post">
      <Button
        type="submit"
        variant="ghost"
        size={compact ? "icon" : "default"}
        aria-label="تسجيل الخروج"
      >
        <LogOutIcon />
        {compact ? null : "تسجيل الخروج"}
      </Button>
    </form>
  );
}
