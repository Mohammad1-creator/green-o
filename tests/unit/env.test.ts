import { afterEach, describe, expect, it, vi } from "vitest";

import { getAppEnv, getPublicSupabaseConfig } from "@/lib/env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAppEnv", () => {
  it.each(["local", "dev", "prod"] as const)("reads %s", (value) => {
    vi.stubEnv("APP_ENV", value);
    expect(getAppEnv()).toBe(value);
  });

  it("treats a missing or unknown value as local, so the banner still shows", () => {
    vi.stubEnv("APP_ENV", "");
    expect(getAppEnv()).toBe("local");
    vi.stubEnv("APP_ENV", "production");
    expect(getAppEnv()).toBe("local");
  });
});

describe("getPublicSupabaseConfig", () => {
  it("returns null until both the URL and the key are set", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcd1234.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(getPublicSupabaseConfig()).toBeNull();
  });

  it("reads the project id from a hosted URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcd1234.supabase.co/");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    expect(getPublicSupabaseConfig()).toEqual({
      url: "https://abcd1234.supabase.co",
      publishableKey: "sb_publishable_test",
      projectRef: "abcd1234",
    });
  });

  it("uses the host name for a local Supabase", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_local");
    expect(getPublicSupabaseConfig()?.projectRef).toBe("127.0.0.1");
  });

  it("returns null for an invalid URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not a url");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    expect(getPublicSupabaseConfig()).toBeNull();
  });
});
