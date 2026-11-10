/** What a form's server action returns to the form. */
export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
} | null;

export function firstFieldError(
  state: ActionState,
  name: string,
): string | undefined {
  return state?.fieldErrors?.[name]?.[0];
}

/** The string fields of a form submission (files are ignored). */
export function formFields(formData: FormData): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") fields[key] = value;
  }
  return fields;
}
