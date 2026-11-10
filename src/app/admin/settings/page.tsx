import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "الإعدادات",
};

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="الإعدادات" />
      <Suspense fallback={<PageSkeleton rows={3} />}>
        <Settings />
      </Suspense>
    </>
  );
}

async function Settings() {
  await requireRole(["general_manager"]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("factory_name, timezone")
    .single();
  if (error) throw error;

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>المصنع</CardTitle>
      </CardHeader>
      <CardContent>
        <SettingsForm
          factoryName={data.factory_name}
          timeZone={data.timezone}
        />
      </CardContent>
    </Card>
  );
}
