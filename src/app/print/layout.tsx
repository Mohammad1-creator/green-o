import { BrandLockup } from "@/components/brand-logo";

/** Print pages: no navigation, A4-friendly width, the company logo on top. */
export default function PrintLayout({ children }: LayoutProps<"/print">) {
  return (
    <main className="mx-auto w-full max-w-4xl bg-white p-6 print:max-w-none print:p-0">
      <header className="mb-6 flex justify-end border-b-4 border-brand-green pb-3">
        <BrandLockup tone="green" width={150} />
      </header>
      {children}
    </main>
  );
}
