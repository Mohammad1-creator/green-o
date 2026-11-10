import { ImageResponse } from "next/og";

import { AppIcon, type IconVariant } from "@/lib/app-icon";

const ICONS: Record<string, { size: number; variant: IconVariant }> = {
  "192": { size: 192, variant: "app" },
  "512": { size: 512, variant: "app" },
  "maskable-512": { size: 512, variant: "maskable" },
  "badge-96": { size: 96, variant: "badge" },
};

export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }));
}

export async function GET(
  _request: Request,
  { params }: RouteContext<"/icons/[name]">,
) {
  const { name } = await params;
  const icon = ICONS[name];
  if (!icon) return new Response("Not found", { status: 404 });

  return new ImageResponse(
    <AppIcon size={icon.size} variant={icon.variant} />,
    {
      width: icon.size,
      height: icon.size,
    },
  );
}
