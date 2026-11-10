import "server-only";

import type { PublicSupabaseConfig } from "@/lib/env";

export type DatabaseHealth = "connected" | "unreachable";

/** Pings the Supabase Auth health endpoint with the public key. */
export async function checkSupabaseHealth(
  config: PublicSupabaseConfig,
): Promise<DatabaseHealth> {
  try {
    const response = await fetch(`${config.url}/auth/v1/health`, {
      headers: { apikey: config.publishableKey },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok ? "connected" : "unreachable";
  } catch {
    return "unreachable";
  }
}
