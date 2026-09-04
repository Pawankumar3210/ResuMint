"use client";

import { useCallback, useEffect, useState } from "react";
import { INSTALL_PROMPT_SNOOZE_DAYS } from "@/constants/site";

const SNOOZE_KEY = "resumint:install-snooze-until";

// Not in the standard lib.dom.d.ts yet -- minimal shape we actually use.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const canInstall = !!deferredPrompt && !installed;

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const snoozeInstallPrompt = useCallback(() => {
    const until = Date.now() + INSTALL_PROMPT_SNOOZE_DAYS * 24 * 60 * 60 * 1000;
    try {
      window.localStorage.setItem(SNOOZE_KEY, String(until));
    } catch {
      /* private browsing or storage disabled -- fail silently */
    }
  }, []);

  const isSnoozed = useCallback(() => {
    try {
      const until = Number(window.localStorage.getItem(SNOOZE_KEY) ?? 0);
      return Date.now() < until;
    } catch {
      return false;
    }
  }, []);

  return { canInstall, promptInstall, snoozeInstallPrompt, isSnoozed, installed };
}
