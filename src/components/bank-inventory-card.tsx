"use client";

import { Bank, Check, ClipboardText, Plus, X } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { dayKey, formatDayLong, formatTime } from "@/lib/dates";
import { formatNumber, newId } from "@/lib/format";
import { computeBankInventories, detectSmsInventoryPreview } from "@/lib/inventory";
import type { Transaction } from "@/lib/types";
import { Money } from "./money";
import { useStore } from "./store";
import { inputClass, primaryButton, secondaryButton } from "./ui";

export function BankInventoryCard() {
  const { t, settings, transactions, openSheet, setSelectedDay, saveTransactionsBatch } = useStore();
  const locale = settings.locale;
  const currency = settings.currency;

  const [isAdding, setIsAdding] = useState(false);
  const [rawSms, setRawSms] = useState("");
  const [error, setError] = useState("");

  const summary = useMemo(() => computeBankInventories(transactions), [transactions]);
  const preview = useMemo(() => detectSmsInventoryPreview(rawSms, currency), [rawSms, currency]);

  async function pasteFromClipboard() {
    setError("");
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setError(t.sms.clipboardNotSms);
        return;
      }
      setRawSms((prev) => (prev.trim() ? `${prev.trim()}\n\n${text.trim()}` : text.trim()));
    } catch {
      setError(t.sms.clipboardDenied);
    }
  }

  function handleSaveInventory() {
    if (preview.items.length === 0) {
      setError(t.inventory.noBalanceFound);
      return;
    }

    const nowMinute = Math.floor(Date.now() / 60_000) * 60_000;
    const newTxs: Transaction[] = preview.items.map((item, idx) => ({
      id: newId(),
      kind: item.kind,
      amount: item.amount,
      at: item.at ?? nowMinute + idx,
      title: item.title || item.bank || t.inventory.unknownBank,
      note: "",
      category: item.kind === "income" ? "salary" : "other",
      bank: item.bank || item.title || t.inventory.unknownBank,
      balance: item.balance,
    }));

    const ok = saveTransactionsBatch(
      newTxs,
      t.inventory.savedToast(formatNumber(newTxs.length, locale)),
    );
    if (ok) {
      setRawSms("");
      setError("");
      setIsAdding(false);
    }
  }

  const hasDuplicateInPreview = preview.rawCount > preview.items.length;

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-sunken p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
            <Bank size={20} weight="duotone" aria-hidden />
          </span>
          <div className="flex flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xs font-bold tracking-wide text-muted">
                {t.inventory.title}
              </h2>
              {summary.count > 0 && (
                <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand-ink">
                  {t.inventory.banksCount(formatNumber(summary.count, locale))}
                </span>
              )}
            </div>
            {/* <p className="text-[11px] leading-relaxed text-muted">
              {t.inventory.subtitle}
            </p> */}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsAdding((prev) => !prev);
            setError("");
          }}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-brand px-3 text-xs font-bold text-on-brand transition-transform active:scale-95"
        >
          {isAdding ? (
            <>
              <X size={13} weight="bold" aria-hidden />
              {t.inventory.closeSmsAction}
            </>
          ) : (
            <>
              <Plus size={13} weight="bold" aria-hidden />
              {t.inventory.addSmsAction}
            </>
          )}
        </button>
      </div>

      {summary.count > 0 ? (
        <div className="flex flex-col gap-1 rounded-xl bg-page/70 px-3.5 py-2.5">
          <span className="text-[11px] font-semibold text-muted">{t.inventory.totalLabel}</span>
          <Money
            value={summary.total}
            className="text-2xl font-black tracking-tight text-brand-ink"
            unitClassName="text-xs font-semibold text-muted"
          />
        </div>
      ) : (
        !isAdding && (
          <p className="rounded-xl bg-page/60 px-3.5 py-2.5 text-xs leading-relaxed text-muted">
            {t.inventory.emptyHint}
          </p>
        )
      )}

      {isAdding && (
        <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-page p-3">
          <textarea
            value={rawSms}
            onChange={(e) => {
              setRawSms(e.target.value);
              setError("");
            }}
            rows={4}
            placeholder={t.inventory.smsPlaceholder}
            className={`${inputClass} h-auto py-2.5 text-xs leading-relaxed`}
          />

          {preview.items.length > 0 && (
            <div className="flex flex-col gap-2 rounded-xl bg-brand-soft/60 p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-brand-ink">
                  {t.inventory.previewLabel(formatNumber(preview.items.length, locale))}
                </span>
                <Money
                  value={preview.totalInventory}
                  className="text-sm font-black text-brand-ink"
                  unitClassName="text-[11px] font-semibold"
                />
              </div>

              {hasDuplicateInPreview && (
                <p className="text-[11px] font-medium text-brand-ink">
                  {t.inventory.duplicateUpdated}
                </p>
              )}

              <ul className="flex flex-col divide-y divide-line/60">
                {preview.items.map((item) => (
                  <li key={item.bankKey} className="flex items-center justify-between gap-2 py-1.5 text-xs">
                    <span className="truncate font-semibold">
                      {item.bank || item.title || t.inventory.unknownBank}
                    </span>
                    <Money
                      value={item.balance}
                      className="font-bold text-brand-ink"
                      unitClassName="text-[10px] text-muted"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className="text-xs font-medium text-danger">{error}</p>}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={pasteFromClipboard}
              className={`${secondaryButton} h-10 px-3 text-xs`}
            >
              <ClipboardText size={16} aria-hidden />
              {t.inventory.pasteClipboard}
            </button>
            <button
              type="button"
              onClick={handleSaveInventory}
              className={`${primaryButton} h-10 px-3 text-xs`}
            >
              <Check size={16} weight="bold" aria-hidden />
              {t.inventory.saveInventory}
            </button>
          </div>
        </div>
      )}

      {summary.count > 0 && (
        <ul className="flex flex-col divide-y divide-line">
          {summary.items.map((item) => {
            const label = item.bank || item.title || t.inventory.unknownBank;
            const dKey = dayKey(new Date(item.at));
            return (
              <li key={item.bankKey}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDay(dKey);
                    openSheet({ type: "tx", id: item.id });
                  }}
                  className="flex w-full items-center justify-between gap-3 py-2.5 text-start transition-opacity active:opacity-70"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-bold">{label}</span>
                      <span className="shrink-0 rounded-md bg-page px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                        {t.inventory.lastInventoryBadge}
                      </span>
                    </div>
                    <span className="text-xs text-muted tabular-nums">
                      {formatDayLong(dKey, locale)} · {formatTime(item.at, locale)}
                    </span>
                  </div>
                  <Money
                    value={item.balance}
                    className="shrink-0 text-sm font-extrabold"
                    unitClassName="text-xs font-medium text-muted"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
