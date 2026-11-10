import "server-only";

export type AppEnv = "local" | "dev" | "prod";

const APP_ENVS: readonly AppEnv[] = ["local", "dev", "prod"];

export const APP_ENV_LABELS: Record<AppEnv, string> = {
  local: "بيئة محلية",
  dev: "بيئة التطوير",
  prod: "بيئة الإنتاج",
};

/**
 * Which deployment this is, from the APP_ENV variable.
 * A missing or unknown value counts as "local", so a production deploy
 * with a missing variable shows the warning banner instead of hiding it.
 */
export function getAppEnv(): AppEnv {
  const value = process.env.APP_ENV;
  return APP_ENVS.find((env) => env === value) ?? "local";
}

export type PublicSupabaseConfig = {
  url: string;
  publishableKey: string;
  /** Project id from the URL (e.g. "abcd1234" in abcd1234.supabase.co). Not a secret. */
  projectRef: string;
};

/**
 * The public Supabase settings. These are safe in the browser because
 * row level security protects the data. Returns null until configured.
 */
export function getPublicSupabaseConfig(): PublicSupabaseConfig | null {
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
