import { timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { dispatchPushBatch } from "@/lib/push/dispatch";

const bodySchema = z.object({ ids: z.array(z.uuid()).min(1).max(500) });

function secretMatches(given: string | null, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Called by the database (pg_net) after new notifications are inserted.
 * Not reachable with a user session: only the shared secret opens it.
 */
export async function POST(request: Request) {
  const expected = process.env.PUSH_DISPATCH_SECRET;
  if (!expected || expected.length < 32) {
    return Response.json(
      { error: "push dispatch is not configured" },
      { status: 503 },
    );
  }
  if (!secretMatches(request.headers.get("x-dispatch-secret"), expected)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const result = await dispatchPushBatch(parsed.data.ids);
  return Response.json(result);
}
