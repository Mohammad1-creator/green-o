import Image from "next/image";

import logoGreen from "@/assets/brand/logo-green.png";
import logoWhite from "@/assets/brand/logo-white.png";
import markGreen from "@/assets/brand/mark-green.png";
import markWhite from "@/assets/brand/mark-white.png";
import wordmarkGreen from "@/assets/brand/wordmark-green.png";
import wordmarkWhite from "@/assets/brand/wordmark-white.png";

type Tone = "green" | "white";

const COMPANY_NAME = "Green O";

/** The company logo: mark and "Green O" side by side, sized by `height`. */
export function BrandLogo({
  tone,
  height = 32,
  className,
}: {
  tone: Tone;
  height?: number;
  className?: string;
}) {
  const mark = tone === "white" ? markWhite : markGreen;
  const wordmark = tone === "white" ? wordmarkWhite : wordmarkGreen;
  const wordHeight = Math.round(height * 0.62);

  return (
    <span
      role="img"
      aria-label={COMPANY_NAME}
      className={`inline-flex w-fit items-center gap-2 ${className ?? ""}`}
      // The Latin wordmark reads left to right even in the RTL layout.
      dir="ltr"
    >
      <Image
        src={mark}
        alt=""
        height={height}
        style={{ width: "auto", height }}
        priority
      />
      <Image
        src={wordmark}
        alt=""
        height={wordHeight}
        style={{ width: "auto", height: wordHeight }}
        priority
      />
    </span>
  );
}

/** The full lockup with the company names, for login and print pages. */
export function BrandLockup({
  tone,
  width = 220,
  className,
}: {
  tone: Tone;
  width?: number;
  className?: string;
}) {
  return (
    <Image
      src={tone === "white" ? logoWhite : logoGreen}
      alt={COMPANY_NAME}
      width={width}
      style={{ width, height: "auto" }}
      className={className}
      priority
    />
  );
}
