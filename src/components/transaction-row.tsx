"use client";

import { formatTime } from "@/lib/dates";
import type { Transaction } from "@/lib/types";
import { CategoryIcon } from "./category-icon";
import { Money } from "./money";
import { useStore } from "./store";

export function TransactionRow({ tx, showTime = true }: { tx: Transaction; showTime?: boolean }) {
  const { t, settings, openSheet } = useStore();
  const untitled = !tx.title;
  const bank = tx.bank === tx.title ? "" : tx.bank;
  const meta = [showTime ? formatTime(tx.at, settings.locale) : "", tx.note || bank]
    .filter(Boolean)
    .join("  |  ");

  return (
    <button
      type="button"
      onClick={() => openSheet({ type: "tx", id: tx.id })}
      className="flex w-full items-center gap-3 rounded-2xl py-3 text-start transition-colors active:bg-sunken"
    >
      <span
        className={`inline-flex size-11 shrink-0 items-center justify-center rounded-2xl ${
          untitled ? "bg-brand-soft text-brand-ink" : "bg-sunken text-ink"
        }`}
      >
        <CategoryIcon category={tx.category} size={22} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={`truncate font-semibold ${untitled ? "text-brand-ink" : ""}`}>
          {untitled ? t.day.untitled : tx.title}
        </span>
        {meta && <span className="truncate text-sm text-muted">{meta}</span>}
      </span>
      <Money
        value={tx.amount}
        sign={tx.kind === "income" ? "+" : "-"}
        className={`shrink-0 text-base font-bold ${tx.kind === "income" ? "text-brand-ink" : ""}`}
      />
    </button>
  );
}
