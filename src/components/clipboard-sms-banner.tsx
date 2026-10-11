"use client";

import { ClipboardText, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useStore } from "./store";

/** How long after the app comes to the foreground the paste offer stays up. */
const SHOW_FOR_MS = 2 * 60 * 1000;

function isIosWebApp() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    ("standalone" in navigator ? navigator.standalone === true : matchMedia("(display-mode: standalone)").matches)
  );
}

function launchedWithSms() {
  const params = new URLSearchParams(location.search);
  return params.has("sms") || params.has("text");
}

/**
 * iOS opens the Home Screen web app from a Shortcut but usually drops the `?sms=` query, so the Shortcut
 * copies the SMS too. Web pages may only read the clipboard from a tap, hence an offer instead of a read.
 */
export function ClipboardSmsBanner() {
  const { t, sheet, receiveSms, openSheet, notify } = useStore();
  const [shownAt, setShownAt] = useState<number | null>(() => (isIosWebApp() && !launchedWithSms() ? Date.now() : null));

  useEffect(() => {
    if (!isIosWebApp()) return;
    const arm = () => setShownAt(Date.now());
    const onVisible = () => {
      if (document.visibilityState === "visible") arm();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", arm);
    window.addEventListener("pageshow", arm);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", arm);
      window.removeEventListener("pageshow", arm);
    };
  }, []);

  useEffect(() => {
    if (shownAt === null) return;
    const timer = setTimeout(() => setShownAt(null), shownAt + SHOW_FOR_MS - Date.now());
    return () => clearTimeout(timer);
  }, [shownAt]);

  if (shownAt === null || sheet) return null;

  // The clipboard holds whatever was copied last, which is often not a bank SMS at all, so its text is
  // only used when it parses. Anything else opens an empty sheet for pasting by hand.
  async function paste() {
    // The offer stays armed: a second SMS can arrive while the app is still in the foreground, where iOS
    // fires no visibility change, so the bar has to be waiting again as soon as the sheet closes.
    setShownAt(Date.now());
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text && receiveSms(text)) return;
      notify(t.sms.clipboardNotSms, "error");
      openSheet({ type: "sms" });
    } catch {
      openSheet({ type: "sms" });
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-2xl bg-brand-soft p-2 ps-4 text-brand-ink">
      <p className="flex-1 text-sm font-semibold">{t.sms.clipboardOffer}</p>
      <button
        type="button"
        onClick={paste}
        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-brand px-4 text-sm font-bold text-on-brand active:scale-95"
      >
        <ClipboardText size={18} aria-hidden />
        {t.sms.clipboardPaste}
      </button>
      <button
        type="button"
        onClick={() => setShownAt(null)}
        aria-label={t.close}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full active:bg-brand/10"
      >
        <X size={18} aria-hidden />
      </button>
    </div>
  );
}
