import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { readPublicSupabaseConfig } from "./public-config";

/**
 * Supabase client with the secret key. It bypasses row level security, so it
 * is used only for: Auth admin calls (create account, set password, block),
 * sending push notifications, and reading global settings.
 */
export function createAdminClient() {
  const config = readPublicSupabaseConfig();
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!config || !secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY and the public Supabase settings must be set.",
    );
  }

  return createClient<Database>(config.url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function hasAdminConfig(): boolean {
  return Boolean(readPublicSupabaseConfig() && process.env.SUPABASE_SECRET_KEY);
}
