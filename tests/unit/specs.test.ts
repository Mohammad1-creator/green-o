import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  buildSpecsSchema,
  formDefinitions,
  formatSpecValue,
  type SpecDefinition,
  specFieldName,
} from "@/features/production/specs";

const base = {
  unit: null,
  options: null,
  min_value: null,
  max_value: null,
  is_required: false,
  is_active: true,
} as const;

const thickness: SpecDefinition = {
  ...base,
  id: "a1",
  label: "السماكة",
  data_type: "number",
  unit: "مم",
  min_value: 1,
  max_value: 50,
  is_required: true,
};
const color: SpecDefinition = {
  ...base,
  id: "b2",
  label: "اللون",
  data_type: "select",
  options: ["أبيض", "رمادي"],
};
const moisture: SpecDefinition = {
  ...base,
  id: "c3",
  label: "مقاوم للرطوبة",
  data_type: "boolean",
};
const note: SpecDefinition = {
  ...base,
  id: "d4",
  label: "ملاحظة",
  data_type: "text",
};

const schema = buildSpecsSchema([thickness, color, moisture, note]);
const fields = (values: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(values).map(([id, value]) => [specFieldName(id), value]),
  );
const errorsOf = (values: Record<string, string>) => {
  const result = schema.safeParse(fields(values));
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
};

describe("buildSpecsSchema", () => {
  it("reads typed values and leaves empty ones out", () => {
    expect(
      schema.parse(
        fields({ a1: "١٨٫٥", b2: "أبيض", c3: "false", d4: "  حواف ناعمة " }),
      ),
    ).toEqual({ a1: 18.5, b2: "أبيض", c3: false, d4: "حواف ناعمة" });
    expect(schema.parse(fields({ a1: "12", b2: "", c3: "" }))).toEqual({
      a1: 12,
    });
  });

  it("enforces the definition's rules", () => {
    expect(errorsOf({ a1: "" })[specFieldName("a1")]).toEqual([
      "هذه المواصفة مطلوبة",
    ]);
    expect(errorsOf({ a1: "ثمانية" })[specFieldName("a1")]).toEqual([
      "اكتب رقماً",
    ]);
    expect(errorsOf({ a1: "60" })[specFieldName("a1")]).toEqual([
      "لا تزيد على 50",
    ]);
    expect(errorsOf({ a1: "12", b2: "أخضر" })[specFieldName("b2")]).toEqual([
      "اختر قيمة من القائمة",
    ]);
    expect(errorsOf({ a1: "12", c3: "ربما" })[specFieldName("c3")]).toEqual([
      "اختر نعم أو لا",
    ]);
  });

  it("does not require a stopped specification", () => {
    const stopped = buildSpecsSchema([{ ...thickness, is_active: false }]);
    expect(stopped.parse({})).toEqual({});
  });
});

describe("formDefinitions", () => {
  it("keeps stopped specifications the product has a value for", () => {
    const stoppedColor = { ...color, is_active: false };
    const stoppedNote = { ...note, is_active: false };
    expect(
      formDefinitions([thickness, stoppedColor, stoppedNote], { b2: "أبيض" }),
    ).toEqual([thickness, stoppedColor]);
  });
});

describe("formatSpecValue", () => {
  it("adds the unit and words yes/no", () => {
    expect(formatSpecValue(thickness, 18)).toBe("18 مم");
    expect(formatSpecValue(moisture, true)).toBe("نعم");
    expect(formatSpecValue(color, undefined)).toBe("—");
  });
});
