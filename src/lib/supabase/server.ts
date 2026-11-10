import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

import type { Database } from "@/types/database";

import { requirePublicSupabaseConfig } from "./public-config";

/**
 * Supabase client that acts as the signed-in user, so row level security
 * applies to every query. Reads cookies, so call it inside <Suspense>.
 */
export async function createClient() {
  // User data is read at request time only, never in a prerender (the auth
  // client checks token expiry with the current time).
  await connection();
  const cookieStore = await cookies();
  const { url, publishableKey } = requirePublicSupabaseConfig();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. The proxy refreshes sessions.
        }
      },
    },
  });
}
