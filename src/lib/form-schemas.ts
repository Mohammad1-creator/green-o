import { z } from "zod";

import { parseDecimal, toWesternDigits } from "@/lib/digits";

/** A form field as trimmed text with Western digits; a missing field is "". */
export const formText = z
  .string()
  .optional()
  .transform((value) => toWesternDigits(value ?? "").trim());

/** Optional text up to `max` characters; empty becomes null. */
export function optionalFormText(max: number) {
  return formText
    .pipe(z.string().max(max, "النص طويل جداً"))
    .transform((value) => value || null);
}

export const optionalUuid = formText
  .transform((value) => value || null)
  .pipe(z.uuid().nullable());

/** A checkbox: "on" when ticked, missing otherwise. */
export const checkbox = z
  .string()
  .optional()
  .transform((value) => value === "on");

/** Digits only, read as a whole number between min and max. */
export function wholeNumber(min: number, max: number) {
  const message = `اكتب رقماً من ${min} إلى ${max}`;
  return z
    .string()
    .regex(/^\d+$/, message)
    .transform(Number)
    .pipe(z.number().int(message).min(min, message).max(max, message));
}

/** An optional decimal number; empty becomes null. */
export const optionalDecimal = formText.transform((value, ctx) => {
  if (value === "") return null;
  const number = parseDecimal(value);
  if (number === null) {
    ctx.addIssue({ code: "custom", message: "اكتب رقماً" });
    return z.NEVER;
  }
  return number;
});
