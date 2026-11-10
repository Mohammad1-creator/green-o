"use client";

import { useEffect } from "react";

/** Registers public/sw.js (push notifications and installing the app). */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Not fatal: the app works without it, only push needs it.
      });
    }
  }, []);
  return null;
}
