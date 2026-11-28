// The app icon: the company mark (white) on the brand green. Rendered with
// next/og from an embedded copy of the mark, so no file reads are needed.

import { MARK_ASPECT, MARK_WHITE_DATA_URI } from "./brand-mark";

/** The dark green of the company logo. */
export const BRAND_GREEN = "#007245";
/** The light green of the company logo. */
export const BRAND_LIGHT_GREEN = "#58aa4c";

export type IconVariant = "app" | "maskable" | "badge";

export function AppIcon({
  size,
  variant,
}: {
  size: number;
  variant: IconVariant;
}) {
  // Maskable icons keep the mark inside the central safe zone.
  const markHeight = Math.round(
    size * (variant === "maskable" ? 0.56 : variant === "badge" ? 0.9 : 0.72),
  );
  const background = variant === "badge" ? "transparent" : BRAND_GREEN;

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background,
        borderRadius: variant === "app" ? Math.round(size * 0.22) : 0,
      }}
    >
      {/* next/og renders plain <img>; next/image does not apply here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={MARK_WHITE_DATA_URI}
        alt=""
        width={Math.round(markHeight * MARK_ASPECT)}
        height={markHeight}
      />
    </div>
  );
}
