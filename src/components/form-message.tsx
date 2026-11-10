import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionState } from "@/lib/action-state";

/** Shows the overall success or error message of a form action. */
export function FormMessage({ state }: { state: ActionState }) {
  if (!state?.message) return null;
  return (
    <Alert
      variant={state.ok ? "default" : "destructive"}
      role={state.ok ? "status" : "alert"}
    >
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}
