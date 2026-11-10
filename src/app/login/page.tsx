import type { Metadata } from "next";
import { Suspense } from "react";

import { getFactorySettings } from "@/lib/settings";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "تسجيل الدخول",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">تسجيل الدخول</h1>
          <p className="text-sm text-muted-foreground">
            <Suspense fallback="نظام إدارة المصنع">
              <FactoryName />
            </Suspense>
          </p>
        </header>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}

async function FactoryName() {
  const settings = await getFactorySettings();
  return <>{settings.factoryName}</>;
}
