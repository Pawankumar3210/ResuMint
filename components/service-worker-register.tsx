"use client";

import { useEffect } from "react";

/**
 * Registers the service worker once the page has fully loaded, so it
 * never competes with the initial page load for bandwidth/CPU (a real
 * Lighthouse performance consideration, not just a nice-to-have).
 *
 * Production only. In `next dev`, Fast Refresh does frequent internal
 * fetches for hot-reloaded chunks -- a caching service worker intercepts
 * and serves stale versions of those, which conflicts with Next's dev
 * client and can cause a reload loop. Real users only ever see the
 * production build, so this restriction costs nothing in practice.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      });
      if ("caches" in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            caches.delete(key);
          }
        });
      }
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline support degrades gracefully if registration fails
        // (e.g. unsupported browser, private browsing) -- never block
        // or interrupt the app itself.
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
