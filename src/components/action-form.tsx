"use client";

import { type ComponentProps, startTransition, useEffect, useRef } from "react";

import type { ActionState } from "@/lib/action-state";

type ActionFormProps = Omit<ComponentProps<"form">, "action" | "onSubmit"> & {
  /** The dispatch function from useActionState. */
  action: (formData: FormData) => void;
  /** With resetOnSuccess: the state the action returned. */
  state?: ActionState;
  /** Clear the fields after a successful submission, for "add another" forms. */
  resetOnSuccess?: boolean;
  /** Ask this question first, and submit only if the user agrees. */
  confirm?: string;
};

/**
 * A form that runs a server action. Unlike <form action={...}>, React does
 * not clear the fields when the action finishes, so a validation error never
 * wipes what the user typed.
 */
export function ActionForm({
  action,
  state,
  resetOnSuccess = false,
  confirm,
  ...props
}: ActionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state?.ok) formRef.current?.reset();
  }, [resetOnSuccess, state]);

  return (
    <form
      {...props}
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const formData = new FormData(event.currentTarget, submitter);
        startTransition(() => action(formData));
      }}
    />
  );
}
