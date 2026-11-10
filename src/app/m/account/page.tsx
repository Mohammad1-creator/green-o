import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/page-skeleton";
import { SignOutButton } from "@/components/sign-out-button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "حسابي",
};

export default function AccountPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <Account />
    </Suspense>
  );
}

async function Account() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: details } = await supabase
    .from("employee_details")
    .select("employee_no, job_title")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">حسابي</h1>
      <Card>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="text-muted-foreground">الاسم</dt>
            <dd className="font-medium">{user.fullName}</dd>
            <dt className="text-muted-foreground">رقم الموظف</dt>
            <dd dir="ltr" className="text-end">
              {details?.employee_no ?? "—"}
            </dd>
            <dt className="text-muted-foreground">الدور</dt>
            <dd>{ROLE_LABELS[user.role]}</dd>
            <dt className="text-muted-foreground">القسم</dt>
            <dd>{user.departmentName ?? "—"}</dd>
            {details?.job_title ? (
              <>
                <dt className="text-muted-foreground">المسمى</dt>
                <dd>{details.job_title}</dd>
              </>
            ) : null}
          </dl>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        لتغيير كلمة المرور راجع مديرك.
      </p>
      <SignOutButton />
    </div>
  );
}
