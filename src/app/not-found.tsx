import type { Metadata } from "next";
import Link from "next/link";

import { BrandBackdrop } from "@/components/brand-backdrop";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "الصفحة غير موجودة",
};

/** Unknown links and missing records (notFound()) land here. */
export default function NotFound() {
  return (
    // Like the login page: the card sits below the name in the picture.
    <main className="flex flex-1 justify-center px-4 pt-[calc(50svh+4.5rem)] pb-8">
      <BrandBackdrop />
      <div className="h-fit w-full max-w-sm space-y-4 rounded-2xl bg-background/95 p-6 text-center shadow-2xl backdrop-blur">
        <p className="text-4xl font-bold text-primary">404</p>
        <h1 className="text-xl font-bold">الصفحة غير موجودة</h1>
        <p className="text-sm text-muted-foreground">
          الرابط خاطئ، أو أن ما تبحث عنه حُذف أو لا تملك صلاحية رؤيته.
        </p>
        <Link href="/" className={buttonVariants({ className: "w-full" })}>
          الذهاب إلى الصفحة الرئيسية
        </Link>
      </div>
    </main>
  );
}
