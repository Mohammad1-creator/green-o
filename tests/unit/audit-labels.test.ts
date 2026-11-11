import { describe, expect, it } from "vitest";

import {
  actionLabel,
  entryFields,
  tableLabel,
  valueText,
} from "@/features/audit/labels";

describe("audit labels", () => {
  it("names tables and actions in Arabic, and falls back to the raw name", () => {
    expect(tableLabel("public.tasks")).toBe("المهام");
    expect(tableLabel("public.unknown")).toBe("public.unknown");
    expect(actionLabel("password_reset")).toBe("إعادة تعيين كلمة المرور");
  });

  it("writes values as short text", () => {
    expect(valueText(true)).toBe("نعم");
    expect(valueText(null)).toBe("—");
    expect(valueText({ a: 1 })).toBe('{"a":1}');
  });
});

describe("entryFields", () => {
  it("shows before and after for the changed fields of an update", () => {
    expect(
      entryFields({
        action: "update",
        changed_fields: ["status"],
        old_data: { id: "x", status: "new" },
        new_data: { id: "x", status: "received" },
      }),
    ).toEqual([{ field: "status", before: "new", after: "received" }]);
  });

  it("shows the values of an insert without bookkeeping columns", () => {
    expect(
      entryFields({
        action: "insert",
        changed_fields: null,
        old_data: null,
        new_data: { id: "x", name: "الصيانة", created_at: "…", notes: null },
      }),
    ).toEqual([{ field: "name", before: null, after: "الصيانة" }]);
  });
});
