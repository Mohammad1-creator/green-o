import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { DEFAULT_TIME_ZONE } from "@/lib/format";
import { createAdminClient, hasAdminConfig } from "@/lib/supabase/admin";

export type FactorySettings = {
  factoryName: string;
  timeZone: string;
};

export const SETTINGS_CACHE_TAG = "app-settings";

const DEFAULT_SETTINGS: FactorySettings = {
  factoryName: "المصنع",
  timeZone: DEFAULT_TIME_ZONE,
};

/**
 * Factory name and time zone. The same for every user, so it is cached and
 * refreshed when the general manager saves the settings.
 */
export async function getFactorySettings(): Promise<FactorySettings> {
  "use cache";
  cacheTag(SETTINGS_CACHE_TAG);
  cacheLife("minutes");

  if (!hasAdminConfig()) return DEFAULT_SETTINGS;
  try {
    const { data } = await createAdminClient()
      .from("app_settings")
      .select("factory_name, timezone")
      .maybeSingle();
    return data
      ? { factoryName: data.factory_name, timeZone: data.timezone }
      : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}
