"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/dal";
import { toUserMessage } from "@/lib/errors";
import { formatNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

/** Recomputes the whole hash chain now, and records the result. */
export async function runChainCheckAction(): Promise<ActionState> {
  if (!(await getCurrentUser())) {
    return { ok: false, message: "انتهت الجلسة. سجّل الدخول مرة أخرى." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("run_audit_chain_check");
  if (error) return { ok: false, message: toUserMessage(error) };
  revalidatePath("/admin/audit");
  const result = data[0];
  if (!result) return { ok: false, message: toUserMessage(null) };
  return result.ok
    ? {
        ok: true,
        message: `السجل سليم. عدد الأسطر المفحوصة: ${formatNumber(result.checked_rows)}.`,
      }
    : {
        ok: false,
        message: `السجل غير سليم عند السطر ${result.first_bad_id}: ${result.problem}`,
      };
}
