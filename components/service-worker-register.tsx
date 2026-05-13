"use client";

import { useEffect } from "react";

/**
 * Registers the app shell service worker in production only so dev HMR
 * is not interfered with under Turbopack.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
      } catch {
        // Non-fatal: install-from-browser still works on some platforms without SW
      }
    };

    void register();
  }, []);

  return null;
}
