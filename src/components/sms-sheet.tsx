"use client";

import { ClipboardText } from "@phosphor-icons/react";
import { useId, useState } from "react";
import { Sheet } from "./sheet";
import { useStore } from "./store";
import { inputClass, primaryButton, secondaryButton } from "./ui";

export function SmsSheet() {
  const { t, closeSheet, ingestSms } = useStore();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fieldId = useId();

  function submit(raw: string) {
    if (!ingestSms(raw)) setError(t.sms.notFound);
  }

  async function pasteFromClipboard() {
    try {
      const clip = await navigator.clipboard.readText();
      setText(clip);
      setError(null);
      if (clip.trim()) submit(clip);
    } catch {
      setError(t.sms.clipboardDenied);
    }
  }

  return (
    <Sheet title={t.sms.title} onClose={closeSheet}>
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          submit(text);
        }}
      >
        <div className="flex flex-col gap-2">
          <label htmlFor={fieldId} className="text-sm font-semibold">
            {t.sms.label}
          </label>
          <textarea
            id={fieldId}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setError(null);
            }}
            rows={5}
            dir="auto"
            placeholder={t.sms.placeholder}
            aria-invalid={!!error}
            aria-describedby={`${fieldId}-help`}
            className={`${inputClass} resize-none leading-relaxed`}
          />
          {error ? (
            <p id={`${fieldId}-help`} className="text-sm font-medium text-danger">
              {error}
            </p>
          ) : (
            <p id={`${fieldId}-help`} className="text-sm text-muted">
              {t.sms.helper}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <button type="submit" disabled={!text.trim()} className={primaryButton}>
            {t.sms.read}
          </button>
          <button type="button" onClick={pasteFromClipboard} className={secondaryButton}>
            <ClipboardText size={20} aria-hidden />
            {t.sms.paste}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
