import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackupRuns } from "@/features/settings/components/backup-runs";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { TOP_ROLES } from "@/lib/auth/roles";

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
  await requireRole(TOP_ROLES);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("factory_name, timezone")
    .single();
  if (error) throw error;

  return (
    <div className="space-y-6">
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
      <BackupRuns timeZone={data.timezone} />
    </div>
  );
}
