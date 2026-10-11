"use client";

import { ArrowDownLeft, ArrowUpRight, Check, Warning, X } from "@phosphor-icons/react";
import { useMemo } from "react";
import { dayKey, formatDayLong } from "@/lib/dates";
import { parseBankSms } from "@/lib/sms-parser";
import type { Transaction } from "@/lib/types";
import { Sheet } from "./sheet";
import { useStore } from "./store";
import { SmsDetails } from "./transaction-sheet";
import { dangerButton, primaryButton } from "./ui";

export function ConfirmSmsSheet({ tx, sms, old }: { tx: Transaction; sms: string; old?: boolean }) {
  const { t, settings, confirmSms, rejectSms } = useStore();
  const parsed = useMemo(() => parseBankSms(sms), [sms]);
  const income = tx.kind === "income";
  const Glyph = income ? ArrowDownLeft : ArrowUpRight;
  const day = formatDayLong(dayKey(new Date(tx.at)), settings.locale);

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
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={rejectSms} className={dangerButton}>
            <X size={18} weight="bold" aria-hidden />
            {t.confirmSms.reject}
          </button>
          <button type="button" onClick={() => confirmSms(tx)} className={primaryButton}>
            <Check size={18} weight="bold" aria-hidden />
            {t.confirmSms.accept}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
