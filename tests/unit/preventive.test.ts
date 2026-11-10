import { describe, expect, it } from "vitest";

import { intervalLabel } from "@/features/maintenance/labels";
import { formatCalendarDate } from "@/lib/format";

describe("intervalLabel", () => {
  it("uses the Arabic counted forms", () => {
    expect(intervalLabel("day", 1)).toBe("كل يوم");
    expect(intervalLabel("week", 2)).toBe("كل أسبوعين");
    expect(intervalLabel("month", 3)).toBe("كل 3 أشهر");
    expect(intervalLabel("week", 10)).toBe("كل 10 أسابيع");
    expect(intervalLabel("day", 14)).toBe("كل 14 يوماً");
  });
});

describe("formatCalendarDate", () => {
  it("never shifts the day, whatever the time zone", () => {
    expect(formatCalendarDate("2026-11-12")).toBe("12 نوفمبر 2026");
    expect(() => formatCalendarDate("12/11/2026")).toThrow(RangeError);
  });
});
