"use client";

import { ArrowDownLeft, ArrowUpRight, Check, X } from "@phosphor-icons/react";
import { useMemo } from "react";
import { parseBankSms } from "@/lib/sms-parser";
import type { Transaction } from "@/lib/types";
import { Sheet } from "./sheet";
import { useStore } from "./store";
import { SmsDetails } from "./transaction-sheet";
import { dangerButton, primaryButton } from "./ui";

export function ConfirmSmsSheet({ tx, sms }: { tx: Transaction; sms: string }) {
  const { t, confirmSms, rejectSms } = useStore();
  const parsed = useMemo(() => parseBankSms(sms), [sms]);
  const income = tx.kind === "income";
  const Glyph = income ? ArrowDownLeft : ArrowUpRight;

  return (
    <Sheet title={t.confirmSms.title} description={t.confirmSms.body} onClose={rejectSms}>
      <div className="flex flex-col gap-5">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-sunken px-3 py-1.5 text-sm font-semibold">
          <Glyph size={16} weight="bold" className="text-brand" aria-hidden />
          {income ? t.form.income : t.form.expense}
        </span>
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
