import type { Metadata } from "next";
import { Suspense } from "react";

import { BrandBackdrop } from "@/components/brand-backdrop";
import { getFactorySettings } from "@/lib/settings";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "تسجيل الدخول",
};

export default function LoginPage() {
  return (
    // The picture has the factory name in its middle; the card sits below it.
    <main className="flex flex-1 justify-center px-4 pt-[calc(50svh+4.5rem)] pb-8">
      <BrandBackdrop />
      <div className="h-fit w-full max-w-sm space-y-5 rounded-2xl bg-background/95 p-6 shadow-2xl backdrop-blur">
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
