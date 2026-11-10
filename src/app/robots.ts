import type { MetadataRoute } from "next";

// Internal system: ask all crawlers to stay out.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
