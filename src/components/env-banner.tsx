import { APP_ENV_LABELS, getAppEnv } from "@/lib/env";

/** Warns that this is not production. Hidden only when APP_ENV is "prod". */
export function EnvBanner() {
  const env = getAppEnv();
  if (env === "prod") return null;

  return (
    <div
      role="status"
      className="bg-amber-300 px-4 py-1.5 text-center text-sm font-medium text-amber-950"
    >
      {APP_ENV_LABELS[env]}: البيانات هنا تجريبية وليست بيانات المصنع الحقيقية
    </div>
  );
}
