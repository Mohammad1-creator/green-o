import { describe, expect, it } from "vitest";

import { parseAwards, pointsField } from "@/features/points/schemas";

const TASK = "11111111-1111-4111-8111-111111111111";
const A = "22222222-2222-4222-8222-222222222222";
const B = "33333333-3333-4333-8333-333333333333";

describe("parseAwards", () => {
  it("reads one amount per person and skips empty fields", () => {
    expect(
      parseAwards({
        taskId: TASK,
        [pointsField(A)]: "10",
        [pointsField(B)]: " ",
        note: " عمل ممتاز ",
      }),
    ).toEqual({
      ok: true,
      taskId: TASK,
      awards: [{ userId: A, points: 10 }],
      note: "عمل ممتاز",
    });
  });

  it("accepts Arabic-Indic digits", () => {
    const result = parseAwards({ taskId: TASK, [pointsField(A)]: "١٥" });
    expect(result.ok && result.awards).toEqual([{ userId: A, points: 15 }]);
  });

  it("refuses zero, decimals, negatives and amounts over 1000", () => {
    for (const value of ["0", "2.5", "-3", "1001", "abc"]) {
      const result = parseAwards({ taskId: TASK, [pointsField(A)]: value });
      expect(result.ok).toBe(false);
      expect(!result.ok && result.fieldErrors?.[pointsField(A)]).toBeTruthy();
    }
  });

  it("needs at least one person", () => {
    expect(parseAwards({ taskId: TASK, [pointsField(A)]: "" })).toEqual({
      ok: false,
      message: "اكتب نقاط موظف واحد على الأقل",
    });
  });

  it("refuses a field that is not a person id", () => {
    expect(parseAwards({ taskId: TASK, "points.not-a-uuid": "5" }).ok).toBe(
      false,
    );
    expect(parseAwards({ taskId: "x", [pointsField(A)]: "5" }).ok).toBe(false);
  });
});
