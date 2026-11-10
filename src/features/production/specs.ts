import { z } from "zod";

import { parseDecimal, toWesternDigits } from "@/lib/digits";
import { formatNumber } from "@/lib/format";

export const SPEC_TYPES = ["number", "select", "boolean", "text"] as const;

export type SpecType = (typeof SPEC_TYPES)[number];

export const SPEC_TYPE_LABELS: Record<SpecType, string> = {
  number: "رقم",
  select: "قائمة خيارات",
  boolean: "نعم / لا",
  text: "نص",
};

export type SpecDefinition = {
  id: string;
  label: string;
  data_type: SpecType;
  unit: string | null;
  options: string[] | null;
  min_value: number | null;
  max_value: number | null;
  is_required: boolean;
  is_active: boolean;
};

export type SpecValue = string | number | boolean;
export type SpecValues = Record<string, SpecValue>;

/** The form field that holds a specification's value. */
export function specFieldName(definitionId: string): string {
  return `spec:${definitionId}`;
}

/**
 * The specifications a product form shows: the active ones, plus stopped
 * ones the product still has a value for (so saving never drops a value).
 */
export function formDefinitions<T extends SpecDefinition>(
  definitions: readonly T[],
  current: Readonly<Record<string, unknown>> = {},
): T[] {
  return definitions.filter(
    (definition) => definition.is_active || definition.id in current,
  );
}

const raw = z
  .string()
  .optional()
  .transform((value) => toWesternDigits(value ?? "").trim());

function fieldSchema(definition: SpecDefinition) {
  return raw.transform((value, ctx): SpecValue | undefined => {
    const fail = (message: string) => {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    };
    if (value === "") {
      return definition.is_required && definition.is_active
        ? fail("هذه المواصفة مطلوبة")
        : undefined;
    }
    switch (definition.data_type) {
      case "number": {
        const number = parseDecimal(value);
        if (number === null) return fail("اكتب رقماً");
        if (definition.min_value !== null && number < definition.min_value) {
          return fail(`لا تقل عن ${formatNumber(definition.min_value)}`);
        }
        if (definition.max_value !== null && number > definition.max_value) {
          return fail(`لا تزيد على ${formatNumber(definition.max_value)}`);
        }
        return number;
      }
      case "boolean":
        if (value === "true") return true;
        if (value === "false") return false;
        return fail("اختر نعم أو لا");
      case "select":
        return definition.options?.includes(value)
          ? value
          : fail("اختر قيمة من القائمة");
      case "text":
        return value.length > 500
          ? fail("النص طويل جداً (500 حرف على الأكثر)")
          : value;
    }
  });
}

/**
 * A schema for a product form's specification fields, built from the
 * definitions: it reads `spec:<id>` fields and returns the values by id.
 * The database checks the same rules again.
 */
export function buildSpecsSchema(definitions: readonly SpecDefinition[]) {
  const shape = Object.fromEntries(
    definitions.map((definition) => [
      specFieldName(definition.id),
      fieldSchema(definition),
    ]),
  );
  return z.object(shape).transform((fields) => {
    const values: SpecValues = {};
    for (const definition of definitions) {
      const value = fields[specFieldName(definition.id)];
      if (value !== undefined) values[definition.id] = value;
    }
    return values;
  });
}

/** "18 مم", "نعم", "أبيض". */
export function formatSpecValue(
  definition: Pick<SpecDefinition, "data_type" | "unit">,
  value: unknown,
): string {
  if (value === undefined || value === null || value === "") return "—";
  switch (definition.data_type) {
    case "number":
      return typeof value === "number"
        ? `${formatNumber(value)}${definition.unit ? ` ${definition.unit}` : ""}`
        : String(value);
    case "boolean":
      return value === true ? "نعم" : value === false ? "لا" : String(value);
    default:
      return String(value);
  }
}

/** The value as a form field's default text. */
export function specInputValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value);
}
