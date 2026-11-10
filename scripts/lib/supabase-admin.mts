import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { STAFF_EMAIL_DOMAIN } from "../../src/lib/auth/staff-email-domain.ts";

export function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

export function staffEmail(employeeNo: string): string {
  return `${employeeNo}@${STAFF_EMAIL_DOMAIN}`;
}

/** A Supabase client with the secret key, from NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY. */
export function adminClientFromEnv(): { supabase: SupabaseClient; url: URL } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    fail(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (for example in .env.local).",
    );
  }
  const supabase = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { supabase, url: new URL(url) };
}

/** Finds a login account by email (fine for the few hundred accounts here). */
export async function findAuthUserId(
  supabase: SupabaseClient,
  email: string,
): Promise<string | null> {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const match = data.users.find((user) => user.email === email);
    if (match) return match.id;
    if (data.users.length < 200) return null;
  }
  return null;
}
