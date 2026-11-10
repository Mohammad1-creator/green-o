// The app icon: the "factory" glyph (lucide) on a green tile. Rendered with
// next/og, so no image files are needed.

const FACTORY_PATHS = [
  "M12 16h.01",
  "M16 16h.01",
  "M3 19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5a.5.5 0 0 0-.769-.422l-4.462 2.844A.5.5 0 0 1 15 10.5v-2a.5.5 0 0 0-.769-.422L9.77 10.922A.5.5 0 0 1 9 10.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z",
  "M8 16h.01",
];

export const BRAND_GREEN = "#166534";

export type IconVariant = "app" | "maskable" | "badge";

export function AppIcon({
  size,
  variant,
}: {
  size: number;
  variant: IconVariant;
}) {
  // Maskable icons keep the glyph inside the central safe zone.
  const glyph = Math.round(
    size * (variant === "maskable" ? 0.5 : variant === "badge" ? 0.9 : 0.62),
  );
  const background = variant === "badge" ? "transparent" : BRAND_GREEN;
  const stroke = "#ffffff";

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
      <svg
        width={glyph}
        height={glyph}
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {FACTORY_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </div>
  );
}
