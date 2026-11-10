"use client";

import { useActionState, useEffect } from "react";

import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm } from "@/components/action-form";
import { type ActionState, firstFieldError } from "@/lib/action-state";

import {
  acknowledgeTaskAction,
  approveTaskAction,
  cancelTaskAction,
  markTaskSeen,
  returnTaskAction,
  startTaskAction,
  submitTaskAction,
} from "../actions";
import type { TaskStatus } from "../labels";

type Step = (previous: ActionState, formData: FormData) => Promise<ActionState>;

function OneClick({
  taskId,
  action,
  label,
  variant = "default",
  size = "lg",
}: {
  taskId: string;
  action: Step;
  label: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "lg";
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    null,
  );
  return (
    <ActionForm action={formAction} className="space-y-2">
      <input type="hidden" name="taskId" value={taskId} />
      <Button
        type="submit"
        variant={variant}
        size={size}
        disabled={pending}
        className="w-full sm:w-auto"
      >
        {pending ? <Spinner /> : null}
        {label}
      </Button>
      <FormMessage state={state} />
    </ActionForm>
  );
}

function WithText({
  taskId,
  action,
  name,
  label,
  placeholder,
  button,
  destructive = false,
  required = true,
}: {
  taskId: string;
  action: Step;
  name: "reason" | "note";
  label: string;
  placeholder?: string;
  button: string;
  destructive?: boolean;
  required?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    null,
  );
  const fieldId = `${name}-${button}`;
  return (
    <ActionForm action={formAction} className="space-y-2" noValidate>
      <input type="hidden" name="taskId" value={taskId} />
      <Field data-invalid={Boolean(firstFieldError(state, name))}>
        <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
        <Textarea
          id={fieldId}
          name={name}
          rows={3}
          placeholder={placeholder}
          required={required}
        />
        <FieldError>{firstFieldError(state, name)}</FieldError>
      </Field>
      <Button
        type="submit"
        variant={destructive ? "destructive" : "default"}
        disabled={pending}
      >
        {pending ? <Spinner /> : null}
        {button}
      </Button>
      <FormMessage state={state} />
    </ActionForm>
  );
}

/** Approve, return or cancel: for the department's manager. */
export function ManagerTaskActions({
  taskId,
  status,
}: {
  taskId: string;
  status: TaskStatus;
}) {
  const final = status === "completed" || status === "cancelled";
  if (final) return null;

  return (
    <div className="space-y-6">
      {status === "pending_approval" ? (
        <>
          <OneClick
            taskId={taskId}
            action={approveTaskAction}
            label="اعتماد المهمة"
          />
          <WithText
            taskId={taskId}
            action={returnTaskAction}
            name="reason"
            label="أو أعدها للمتابعة مع ذكر السبب"
            placeholder="ما الذي يحتاج إلى متابعة؟"
            button="إعادة للمتابعة"
          />
        </>
      ) : null}
      <details className="rounded-lg border p-3">
        <summary className="cursor-pointer text-sm font-medium">
          إلغاء المهمة
        </summary>
        <div className="pt-3">
          <WithText
            taskId={taskId}
            action={cancelTaskAction}
            name="reason"
            label="سبب الإلغاء"
            button="تأكيد الإلغاء"
            destructive
          />
        </div>
      </details>
    </div>
  );
}

/** What the assignee can do next, as large buttons for the phone. */
export function AssigneeTaskActions({
  taskId,
  status,
  acknowledged,
}: {
  taskId: string;
  status: TaskStatus;
  acknowledged: boolean;
}) {
  if (status === "pending_approval") {
    return (
      <p className="text-sm text-muted-foreground">
        أُرسلت المهمة، وهي بانتظار اعتماد المدير.
      </p>
    );
  }
  if (status === "completed") {
    return (
      <p className="text-sm text-muted-foreground">المهمة مكتملة ومعتمدة.</p>
    );
  }
  if (status === "cancelled") {
    return <p className="text-sm text-muted-foreground">أُلغيت هذه المهمة.</p>;
  }

  return (
    <div className="space-y-4">
      {!acknowledged ? (
        <OneClick
          taskId={taskId}
          action={acknowledgeTaskAction}
          label="استلمتها"
          variant="outline"
        />
      ) : null}
      {status === "new" ||
      status === "received" ||
      status === "needs_follow_up" ? (
        <OneClick
          taskId={taskId}
          action={startTaskAction}
          label="بدء التنفيذ"
        />
      ) : null}
      {status === "in_progress" ? (
        <WithText
          taskId={taskId}
          action={submitTaskAction}
          name="note"
          label="ملاحظة للمدير (اختياري)"
          placeholder="ما الذي أُنجز؟"
          button="تم الإنجاز: أرسل للاعتماد"
          required={false}
        />
      ) : null}
    </div>
  );
}

/** Records "seen" once the assignee actually opens the task. */
export function MarkSeen({ taskId }: { taskId: string }) {
  useEffect(() => {
    void markTaskSeen(taskId);
  }, [taskId]);
  return null;
}
