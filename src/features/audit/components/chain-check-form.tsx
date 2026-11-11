"use client";

import { useActionState } from "react";

import { ActionForm } from "@/components/action-form";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { ActionState } from "@/lib/action-state";

import { runChainCheckAction } from "../actions";

export function ChainCheckForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    runChainCheckAction,
    null,
  );
  return (
    <ActionForm action={formAction} className="space-y-3">
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? <Spinner /> : null}
        تحقق الآن
      </Button>
      <FormMessage state={state} />
    </ActionForm>
  );
}
