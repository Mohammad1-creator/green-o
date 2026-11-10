/** Print pages: no navigation, A4-friendly width. */
export default function PrintLayout({ children }: LayoutProps<"/print">) {
  return (
    <main className="mx-auto w-full max-w-4xl p-6 print:max-w-none print:p-0">
      {children}
    </main>
  );
}
