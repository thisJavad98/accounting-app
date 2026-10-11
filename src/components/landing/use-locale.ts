"use client";

import { useSyncExternalStore } from "react";
import type { Locale } from "@/lib/types";

const EVENT = "dakhl:locale";

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}

const read = (): Locale => (document.documentElement.lang === "en" ? "en" : "fa");

export function useLandingLocale(): Locale {
  return useSyncExternalStore(subscribe, read, () => "fa");
}

export function setLandingLocale(locale: Locale) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `dk_lang=${locale}; Path=/; Max-Age=${60 * 60 * 24 * 400}; SameSite=Lax${secure}`;
  const root = document.documentElement;
  root.lang = locale;
  root.dir = locale === "fa" ? "rtl" : "ltr";
  window.dispatchEvent(new Event(EVENT));
}
