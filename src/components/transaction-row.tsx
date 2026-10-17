"use client";

import { Prohibit } from "@phosphor-icons/react";
import { formatTime } from "@/lib/dates";
import type { Transaction } from "@/lib/types";
import { CategoryIcon } from "./category-icon";
import { Money } from "./money";
import { useStore } from "./store";

export function TransactionRow({
  tx,
  showTime = true,
  showUnnecessaryAction = false,
}: {
  tx: Transaction;
  showTime?: boolean;
  showUnnecessaryAction?: boolean;
}) {
  const { t, settings, openSheet, toggleUnnecessary } = useStore();
  const untitled = !tx.title;
  const unnecessary = tx.kind === "expense" && !!tx.unnecessary;
  const bank = tx.bank === tx.title ? "" : tx.bank;
  const meta = [showTime ? formatTime(tx.at, settings.locale) : "", tx.note || bank]
    .filter(Boolean)
    .join("  |  ");

  return (
    <div className="flex w-full items-center gap-2">
      <button
        type="button"
        onClick={() => openSheet({ type: "tx", id: tx.id })}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl py-3 text-start transition-colors active:bg-sunken"
      >
        <span
          className={`inline-flex size-11 shrink-0 items-center justify-center rounded-2xl ${
            unnecessary
              ? "bg-brand-soft text-brand-ink"
              : untitled
                ? "bg-brand-soft text-brand-ink"
                : "bg-sunken text-ink"
          }`}
        >
          <CategoryIcon category={tx.category} size={22} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className={`truncate font-semibold ${
              unnecessary ? "line-through opacity-60" : untitled ? "text-brand-ink" : ""
            }`}
          >
            {untitled ? t.day.untitled : tx.title}
          </span>
          {meta && <span className="truncate text-sm text-muted">{meta}</span>}
        </span>
        <Money
          value={tx.amount}
          sign={tx.kind === "income" ? "+" : "-"}
          className={`shrink-0 text-base font-bold ${
            tx.kind === "income" ? "text-brand-ink" : unnecessary ? "line-through opacity-55" : ""
          }`}
        />
      </button>
      {showUnnecessaryAction && tx.kind === "expense" && (
        <button
          type="button"
          aria-pressed={unnecessary}
          onClick={() => toggleUnnecessary([tx.id])}
          className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition-colors active:scale-95 ${
            unnecessary ? "bg-brand text-on-brand" : "bg-sunken text-muted"
          }`}
        >
          <Prohibit size={13} weight={unnecessary ? "bold" : "regular"} aria-hidden />
          {unnecessary ? t.month.unmarkUnnecessary : t.month.markUnnecessary}
        </button>
      )}
    </div>
  );
}
