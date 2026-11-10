import type { MetadataRoute } from "next";

import { BRAND_GREEN } from "@/lib/app-icon";
import { getFactorySettings } from "@/lib/settings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { factoryName } = await getFactorySettings();

  return {
    id: "/m",
    name: factoryName,
    short_name: factoryName.slice(0, 12),
    description: "مهامك وبلاغات الأعطال وأعمال الإنتاج في المصنع.",
    lang: "ar",
    dir: "rtl",
    start_url: "/m",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: BRAND_GREEN,
    icons: [
      {
        src: "/icons/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
