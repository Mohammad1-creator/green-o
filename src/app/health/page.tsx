import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_ENV_LABELS, getAppEnv, getPublicSupabaseConfig } from "@/lib/env";
import { checkSupabaseHealth } from "@/lib/supabase/health";

export const metadata: Metadata = {
  title: "حالة النظام",
};

export default function HealthPage() {
  const env = getAppEnv();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-bold">حالة النظام</h1>

      <Card>
        <CardHeader>
          <CardTitle>الاتصال</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-4">
            <dt className="text-muted-foreground">البيئة</dt>
            <dd data-testid="app-env" className="font-medium">
              {APP_ENV_LABELS[env]}
            </dd>

            <dt className="text-muted-foreground">قاعدة البيانات</dt>
            <dd data-testid="db-status">
              <Suspense fallback={<span>جارٍ الفحص…</span>}>
                <DatabaseStatus />
              </Suspense>
            </dd>
          </dl>
        </CardContent>
      </Card>

      <Link
        href="/"
        className="text-sm text-primary underline-offset-4 hover:underline"
      >
        العودة للصفحة الرئيسية
      </Link>
    </main>
  );
}

async function DatabaseStatus() {
  // Check on every visit, never from a prerendered result.
  await connection();

  const config = getPublicSupabaseConfig();
  if (!config) {
    return <Badge variant="secondary">غير مضبوطة بعد</Badge>;
  }

  const health = await checkSupabaseHealth(config);
  if (health === "connected") {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <Badge>متصلة</Badge>
        <span className="text-sm text-muted-foreground" dir="ltr">
          {config.projectRef}
        </span>
      </span>
    );
  }

  return <Badge variant="destructive">تعذّر الاتصال</Badge>;
}
