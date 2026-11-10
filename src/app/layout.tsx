import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";

import { EnvBanner } from "@/components/env-banner";
import { DirectionProvider } from "@/components/ui/direction";

import "./globals.css";

const fontSans = IBM_Plex_Sans_Arabic({
  variable: "--font-sans",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "نظام إدارة المصنع",
    template: "%s · نظام إدارة المصنع",
  },
  description: "نظام عربي لإدارة المهام والصيانة والإنتاج في المصنع.",
  // Internal system: keep it out of search engines.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  // Lets the mobile app draw under the iPhone notch; layouts pad with safe-area insets.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${fontSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <DirectionProvider direction="rtl">
          <EnvBanner />
          {children}
        </DirectionProvider>
      </body>
    </html>
  );
}
