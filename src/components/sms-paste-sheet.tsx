"use client";

import { ClipboardText } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { looksLikeBankSms } from "@/lib/sms-parser";
import { Sheet } from "./sheet";
import { useStore } from "./store";
import { ghostButton, primaryButton } from "./ui";

/**
 * The first half of reading a bank SMS the Shortcut left on the clipboard. Once the text is read this
 * sheet gives way to the confirmation one, so the whole thing reads as a single drawer to the user.
 */
export function SmsPasteSheet() {
  const { t, closeSheet, receiveSms, openSheet, notify } = useStore();
  const attempted = useRef(false);

  // Where a browser allows a silent read there is nothing to tap: the details appear by themselves.
  // iOS refuses without a tap, which is what the button below is for.
  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    navigator.clipboard
      ?.readText()
      .then((text) => text.trim() && receiveSms(text.trim()))
      .catch(() => {});
  }, [receiveSms]);

  async function read() {
    let text: string;
    try {
      text = (await navigator.clipboard.readText()).trim();
    } catch {
      openSheet({ type: "sms" });
      return;
    }
    if (text && receiveSms(text)) return;
    // Text about money that still would not read is carried over so it can be corrected by hand.
    // Anything else was never an SMS, so it is left behind rather than passed off as a transaction.
    const keep = looksLikeBankSms(text);
    notify(keep ? t.sms.notFound : t.sms.clipboardNotSms, "error");
    openSheet(keep ? { type: "sms", text } : { type: "sms" });
  }

  return (
    <Sheet title={t.sms.offerTitle} description={t.sms.offerBody} onClose={closeSheet}>
      <div className="flex flex-col gap-3">
        <button type="button" onClick={read} className={primaryButton}>
          <ClipboardText size={20} aria-hidden />
          {t.sms.offerRead}
        </button>
        <button type="button" onClick={closeSheet} className={ghostButton}>
          {t.sms.offerLater}
        </button>
      </div>
    </Sheet>
  );
}
