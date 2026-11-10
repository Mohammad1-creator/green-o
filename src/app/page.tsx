import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getCurrentUser } from "@/lib/auth/dal";
import { homePathFor } from "@/lib/auth/roles";
import { readPublicSupabaseConfig } from "@/lib/supabase/public-config";

/** Sends each user to their home: managers to /admin, employees to /m. */
export default function HomePage() {
  if (!readPublicSupabaseConfig()) return <NotConfigured />;

  return (
    <main className="flex flex-1 items-center justify-center">
      <Suspense fallback={<Spinner className="size-6" />}>
        <RedirectHome />
      </Suspense>
    </main>
  );
}

async function RedirectHome(): Promise<null> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signout?reason=inactive");
  redirect(homePathFor(user.role));
}

function NotConfigured() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-4 py-10">
      <h1 className="text-2xl font-bold">نظام إدارة المصنع</h1>
      <p className="text-muted-foreground">
        النظام غير مربوط بقاعدة البيانات بعد. اتبع دليل الإعداد في المستودع
        (docs/deploy.md).
      </p>
      <div>
        <Link href="/health" className={buttonVariants({ variant: "outline" })}>
          فحص حالة النظام
        </Link>
      </div>
    </main>
  );
}
