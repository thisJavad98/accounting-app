"use client";

import { ArrowDownLeft, ArrowUpRight, Check, Warning, X } from "@phosphor-icons/react";
import { useId, useMemo, useState } from "react";
import { dayKey, formatDayLong } from "@/lib/dates";
import { parseBankSms } from "@/lib/sms-parser";
import type { CategoryId, Transaction } from "@/lib/types";
import { CategoryPicker } from "./category-picker";
import { Sheet } from "./sheet";
import { useStore } from "./store";
import { SmsDetails } from "./transaction-sheet";
import { chipClass, dangerButton, inputClass, primaryButton } from "./ui";

export function ConfirmSmsSheet({ tx, sms, old }: { tx: Transaction; sms: string; old?: boolean }) {
  const { t, settings, transactions, confirmSms, rejectSms } = useStore();
  const parsed = useMemo(() => parseBankSms(sms), [sms]);
  const income = tx.kind === "income";
  const Glyph = income ? ArrowDownLeft : ArrowUpRight;
  const day = formatDayLong(dayKey(new Date(tx.at)), settings.locale);
  const ids = useId();

  const [title, setTitle] = useState(tx.title);
  const [note, setNote] = useState(tx.note);
  const [category, setCategory] = useState<CategoryId>(tx.category);
  const [titleError, setTitleError] = useState(false);

  const recentTitles = useMemo(() => {
    const seen = new Set<string>();
    const result: { title: string; category: CategoryId }[] = [];
    for (const item of [...transactions].sort((a, b) => b.at - a.at)) {
      const key = item.title.trim();
      if (!key || item.kind !== tx.kind || seen.has(key)) continue;
      seen.add(key);
      result.push({ title: key, category: item.category });
      if (result.length === 6) break;
    }
    return result;
  }, [transactions, tx.kind]);

  function accept() {
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    confirmSms({ ...tx, title: title.trim(), note: note.trim(), category });
  }

  return (
    <Sheet title={t.confirmSms.title} description={t.confirmSms.body} onClose={rejectSms}>
      <div className="flex flex-col gap-5">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-sunken px-3 py-1.5 text-sm font-semibold">
          <Glyph size={16} weight="bold" className="text-brand" aria-hidden />
          {income ? t.form.income : t.form.expense}
        </span>
        {old && (
          <p className="flex items-start gap-2 rounded-2xl bg-sunken p-3 text-sm font-medium">
            <Warning size={18} weight="fill" className="mt-0.5 shrink-0 text-brand" aria-hidden />
            {t.confirmSms.notToday(day)}
          </p>
        )}
        <SmsDetails tx={tx} parsed={parsed} sms={sms} showOriginal />

        <div className="flex flex-col gap-2">
          <label htmlFor={`${ids}-title`} className="text-sm font-semibold">
            {t.form.titleLabel}
          </label>
          <input
            id={`${ids}-title`}
            value={title}
            autoFocus
            maxLength={60}
            onChange={(event) => {
              setTitle(event.target.value);
              setTitleError(false);
            }}
            aria-invalid={titleError}
            aria-describedby={`${ids}-title-help`}
            className={inputClass}
          />
          {titleError ? (
            <p id={`${ids}-title-help`} className="text-sm font-medium text-danger">
              {t.form.titleError}
            </p>
          ) : (
            <p id={`${ids}-title-help`} className="text-sm text-muted">
              {t.form.titleHelper}
            </p>
          )}
          {recentTitles.length > 0 && (
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pt-1" aria-label={t.form.recent}>
              {recentTitles.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => {
                    setTitle(item.title);
                    setCategory(item.category);
                    setTitleError(false);
                  }}
                  className={chipClass(title.trim() === item.title)}
                >
                  {item.title}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={`${ids}-note`} className="text-sm font-semibold">
            {t.form.noteLabel}
          </label>
          <textarea
            id={`${ids}-note`}
            value={note}
            rows={2}
            maxLength={160}
            onChange={(event) => setNote(event.target.value)}
            aria-describedby={`${ids}-note-help`}
            className={`${inputClass} resize-none leading-relaxed`}
          />
          <p id={`${ids}-note-help`} className="text-sm text-muted">
            {t.form.noteHelper}
          </p>
        </div>

        <CategoryPicker value={category} onChange={setCategory} />

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={rejectSms} className={dangerButton}>
            <X size={18} weight="bold" aria-hidden />
            {t.confirmSms.reject}
          </button>
          <button type="button" onClick={accept} className={primaryButton}>
            <Check size={18} weight="bold" aria-hidden />
            {t.confirmSms.accept}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
