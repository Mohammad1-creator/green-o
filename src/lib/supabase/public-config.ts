export type PublicSupabaseConfig = {
  url: string;
  publishableKey: string;
  /** Project id from the URL (e.g. "abcd1234" in abcd1234.supabase.co). Not a secret. */
  projectRef: string;
};

/**
 * The public Supabase settings, safe in the browser because row level
 * security protects the data. Returns null until both values are set.
 * (The env names must stay literal so Next.js can inline them.)
 */
export function readPublicSupabaseConfig(): PublicSupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;

  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }

  const projectRef = host.endsWith(".supabase.co")
    ? (host.split(".")[0] ?? host)
    : host;
  return { url: url.replace(/\/+$/, ""), publishableKey, projectRef };
}

export function requirePublicSupabaseConfig(): PublicSupabaseConfig {
  const config = readPublicSupabaseConfig();
  if (!config) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  return config;
}
