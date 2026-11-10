import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

import { requirePublicSupabaseConfig } from "./public-config";

/** Supabase client for Client Components. Uses only the public key. */
export function createClient() {
  const { url, publishableKey } = requirePublicSupabaseConfig();
  return createBrowserClient<Database>(url, publishableKey);
}
