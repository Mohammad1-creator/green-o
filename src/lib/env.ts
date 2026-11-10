import "server-only";

export {
  readPublicSupabaseConfig as getPublicSupabaseConfig,
  type PublicSupabaseConfig,
} from "@/lib/supabase/public-config";

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
