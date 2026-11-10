import { describe, expect, it } from "vitest";

import { intervalLabel } from "@/features/maintenance/labels";
import { pmCompliance } from "@/features/maintenance/pm-compliance";
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

describe("pmCompliance", () => {
  const due = "2026-11-10T20:59:00Z";

  it("counts on time, late, missed and cancelled separately", () => {
    const result = pmCompliance([
      {
        status: "completed",
        due_at: due,
        submitted_at: "2026-11-10T08:00:00Z",
      },
      {
        status: "completed",
        due_at: due,
        submitted_at: "2026-11-11T08:00:00Z",
      },
      { status: "in_progress", due_at: due, submitted_at: null },
      {
        status: "pending_approval",
        due_at: due,
        submitted_at: "2026-11-10T09:00:00Z",
      },
      { status: "cancelled", due_at: due, submitted_at: null },
    ]);
    expect(result).toEqual({
      due: 4,
      onTime: 1,
      late: 1,
      missed: 2,
      cancelled: 1,
      rate: 0.25,
    });
  });

  it("has no rate when nothing was due", () => {
    expect(pmCompliance([]).rate).toBeNull();
  });
});

describe("formatCalendarDate", () => {
  it("never shifts the day, whatever the time zone", () => {
    expect(formatCalendarDate("2026-11-12")).toBe("12 نوفمبر 2026");
    expect(() => formatCalendarDate("12/11/2026")).toThrow(RangeError);
  });
});
