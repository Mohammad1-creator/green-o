import { describe, expect, it } from "vitest";

import {
  parsePeriod,
  periodPresets,
  periodQuery,
} from "@/features/reports/period";

const TODAY = "2026-11-11";

describe("parsePeriod", () => {
  it("defaults to the last 30 days", () => {
    expect(parsePeriod({}, TODAY)).toEqual({
      from: "2026-10-13",
      to: "2026-11-11",
    });
  });

  it("keeps a valid period and rejects odd ones", () => {
    expect(
      parsePeriod({ from: "2026-11-01", to: "2026-11-05" }, TODAY),
    ).toEqual({ from: "2026-11-01", to: "2026-11-05" });
    const fallback = parsePeriod({}, TODAY);
    expect(
      parsePeriod({ from: "2026-11-05", to: "2026-11-01" }, TODAY),
    ).toEqual(fallback);
    expect(
      parsePeriod({ from: "2024-01-01", to: "2026-11-01" }, TODAY),
    ).toEqual(fallback);
    expect(parsePeriod({ from: "11/01/2026", to: TODAY }, TODAY)).toEqual(
      fallback,
    );
  });
});

describe("periodPresets", () => {
  it("covers this month and the whole of last month", () => {
    const presets = Object.fromEntries(
      periodPresets(TODAY).map((preset) => [preset.label, preset.period]),
    );
    expect(presets["هذا الشهر"]).toEqual({ from: "2026-11-01", to: TODAY });
    expect(presets["الشهر الماضي"]).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    });
  });

  it("crosses the year boundary in January", () => {
    const last = periodPresets("2027-01-15").find(
      (preset) => preset.label === "الشهر الماضي",
    );
    expect(last?.period).toEqual({ from: "2026-12-01", to: "2026-12-31" });
  });
});

describe("periodQuery", () => {
  it("adds only the filters that are set", () => {
    expect(
      periodQuery(
        { from: "2026-11-01", to: "2026-11-05" },
        { department: undefined, format: "csv" },
      ),
    ).toBe("from=2026-11-01&to=2026-11-05&format=csv");
  });
});
