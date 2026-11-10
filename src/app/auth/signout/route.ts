import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

async function signOut(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const url = new URL("/login", request.url);
  if (request.nextUrl.searchParams.get("reason") === "inactive") {
    url.searchParams.set("reason", "inactive");
  }
  return NextResponse.redirect(url, { status: 303 });
}

/** The "sign out" button posts here. */
export function POST(request: NextRequest) {
  return signOut(request);
}

/** Used to end a session whose account was deactivated. */
export function GET(request: NextRequest) {
  return signOut(request);
}
