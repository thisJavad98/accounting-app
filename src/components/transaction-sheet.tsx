"use client";

import { ArrowDownLeft, ArrowUpRight, Prohibit, Trash } from "@phosphor-icons/react";
import { usePathname, useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { dayKey, formatDayLong, formatTime, fromDayKey, todayKey } from "@/lib/dates";
import { formatAmountInput, formatNumber, newId, parseAmount } from "@/lib/format";
import { parseBankSms, type ParsedSms } from "@/lib/sms-parser";
import type { CategoryId, Transaction, TxKind } from "@/lib/types";
import { CategoryPicker } from "./category-picker";
import { Sheet } from "./sheet";
import { useStore, type TxSheetDraft } from "./store";
import { chipClass, dangerButton, ghostButton, inputClass, primaryButton } from "./ui";

function defaultTimestamp(day: string) {
  if (day === todayKey()) return Date.now();
  const date = fromDayKey(day);
  const now = new Date();
  date.setHours(now.getHours(), now.getMinutes(), 0, 0);
  return date.getTime();
}

export function SmsDetails({
  tx,
  parsed,
  sms,
  showOriginal = false,
}: {
  tx: Transaction;
  parsed: ParsedSms | null;
  sms?: string;
  showOriginal?: boolean;
}) {
  const { t, settings } = useStore();
  const locale = settings.locale;
  const unit = t.currencies[settings.currency];
  const fields = [
    { label: t.form.bank, value: tx.bank },
    { label: t.form.when, value: `${formatDayLong(dayKey(new Date(tx.at)), locale)}  ${formatTime(tx.at, locale)}` },
    { label: t.form.balance, value: tx.balance === null ? "" : `${formatNumber(tx.balance, locale)} ${unit}` },
    { label: t.form.account, value: parsed?.account ? `**${parsed.account}` : "" },
    { label: t.form.holder, value: parsed?.holder ?? "" },
  ].filter((field) => field.value);

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-brand-soft p-4 text-brand-ink">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{t.form.extracted}</span>
        <span className="text-xl font-black tabular-nums">
          {tx.kind === "income" ? "+" : "\u2212"}
          {formatNumber(tx.amount, locale)} <span className="text-xs font-medium">{unit}</span>
        </span>
      </div>
      {fields.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {fields.map((field) => (
            <div key={field.label} className="flex min-w-0 flex-col">
              <dt className="text-xs opacity-75">{field.label}</dt>
              <dd className="truncate font-semibold">{field.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {sms && (
        <details className="text-sm" open={showOriginal}>
          <summary className="cursor-pointer select-none opacity-80">{t.form.original}</summary>
          <p dir="auto" className="mt-2 whitespace-pre-line leading-relaxed opacity-90">
            {sms}
          </p>
        </details>
      )}
    </div>
  );
}

export function TransactionSheet({
  id,
  sms,
  defaultKind = "expense",
  defaultCategory = "other",
  draft,
}: {
  id: string | null;
  sms?: string;
  defaultKind?: TxKind;
  defaultCategory?: CategoryId;
  draft?: TxSheetDraft;
}) {
  const {
    t,
    settings,
    transactions,
    selectedDay,
    closeSheet,
    saveTransaction,
    deleteTransaction,
    notify,
    beginCategoryReturn,
  } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const existing = useMemo(
    () => (id ? transactions.find((tx) => tx.id === id) ?? null : null),
    [id, transactions],
  );

  const [kind, setKind] = useState<TxKind>(draft?.kind ?? existing?.kind ?? defaultKind);
  const [amountText, setAmountText] = useState(() => {
    if (draft) return draft.amountText;
    return existing ? formatAmountInput(String(existing.amount), settings.locale) : "";
  });
  const parsed = useMemo(() => (sms ? parseBankSms(sms) : null), [sms]);
  const [title, setTitle] = useState(
    draft?.title ?? (existing?.title || parsed?.suggestedTitle || ""),
  );
  const [note, setNote] = useState(draft?.note ?? existing?.note ?? "");
  const [category, setCategory] = useState<CategoryId>(
    draft ? defaultCategory : (existing?.category ?? defaultCategory),
  );
  const [unnecessary, setUnnecessary] = useState<boolean>(
    draft?.unnecessary ?? !!existing?.unnecessary,
  );

  function openCreateCategory() {
    beginCategoryReturn({
      returnPath: pathname || "/app",
      sheet: {
        type: "tx",
        id,
        sms,
        kind,
        category,
        draft: { kind, amountText, title, note, unnecessary },
      },
    });
    router.push("/app/settings/categories?new=1");
  }
  const [errors, setErrors] = useState<{ amount?: boolean; title?: boolean }>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ids = useId();

  const fromBank = !!existing && !existing.title && (!!sms || !!existing.bank);
  const heading = fromBank ? t.form.newSms : existing ? t.form.editTx : t.form.newTx;

  const recentTitles = useMemo(() => {
    const seen = new Set<string>();
    const result: { title: string; category: CategoryId }[] = [];
    for (const tx of [...transactions].sort((a, b) => b.at - a.at)) {
      const key = tx.title.trim();
      if (!key || tx.kind !== kind || seen.has(key)) continue;
      seen.add(key);
      result.push({ title: key, category: tx.category });
      if (result.length === 6) break;
    }
    return result;
  }, [transactions, kind]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const amount = parseAmount(amountText);
    const nextErrors = { amount: amount <= 0, title: !title.trim() };
    setErrors(nextErrors);
    if (nextErrors.amount || nextErrors.title) return;

    const tx: Transaction = {
      id: existing?.id ?? newId(),
      kind,
      amount,
      at: existing?.at ?? defaultTimestamp(selectedDay),
      title: title.trim(),
      note: note.trim(),
      category,
      bank: existing?.bank ?? "",
      balance: existing?.balance ?? null,
      unnecessary: kind === "expense" && unnecessary ? true : undefined,
    };
    if (saveTransaction(tx)) {
      notify(t.toast.saved);
      closeSheet();
    }
  }

  return (
    <Sheet title={heading} description={fromBank ? t.form.newSmsBody : undefined} onClose={closeSheet}>
      <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
        {fromBank && existing && (
          <SmsDetails tx={existing} parsed={parsed} sms={sms} />
        )}

        <div role="radiogroup" aria-label={t.form.expense} className="grid grid-cols-2 gap-1 rounded-full bg-sunken p-1">
          {(["expense", "income"] as const).map((value) => {
            const active = kind === value;
            const Glyph = value === "expense" ? ArrowUpRight : ArrowDownLeft;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setKind(value)}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors ${
                  active ? "bg-surface text-ink shadow-sm" : "text-muted"
                }`}
              >
                <Glyph size={18} weight="bold" className={active ? "text-brand" : ""} aria-hidden />
                {value === "expense" ? t.form.expense : t.form.income}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={`${ids}-amount`} className="text-sm font-semibold">
            {t.form.amount}
          </label>
          <div className="relative">
            <input
              id={`${ids}-amount`}
              inputMode="decimal"
              autoComplete="off"
              autoFocus={!existing}
              value={amountText}
              onChange={(event) => {
                setAmountText(formatAmountInput(event.target.value, settings.locale));
                setErrors((e) => ({ ...e, amount: false }));
              }}
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? `${ids}-amount-error` : undefined}
              className={`${inputClass} pe-20 text-2xl font-bold tabular-nums`}
            />
            <span className="pointer-events-none absolute inset-y-0 end-4 flex items-center text-sm font-medium text-muted">
              {t.currencies[settings.currency]}
            </span>
          </div>
          {errors.amount && (
            <p id={`${ids}-amount-error`} className="text-sm font-medium text-danger">
              {t.form.amountError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={`${ids}-title`} className="text-sm font-semibold">
            {t.form.titleLabel}
          </label>
          <input
            id={`${ids}-title`}
            value={title}
            autoFocus={fromBank}
            maxLength={60}
            onChange={(event) => {
              setTitle(event.target.value);
              setErrors((e) => ({ ...e, title: false }));
            }}
            aria-invalid={!!errors.title}
            aria-describedby={`${ids}-title-help`}
            className={inputClass}
          />
          {errors.title ? (
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
                    setErrors((e) => ({ ...e, title: false }));
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

        <CategoryPicker value={category} onChange={setCategory} onCreateNew={openCreateCategory} />

        {kind === "expense" && (
          <button
            type="button"
            aria-pressed={unnecessary}
            onClick={() => setUnnecessary((v) => !v)}
            className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-start text-sm font-semibold transition-colors ${
              unnecessary ? "bg-brand-soft text-brand-ink" : "bg-sunken text-ink"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Prohibit size={18} weight={unnecessary ? "fill" : "regular"} aria-hidden />
              {t.form.unnecessary}
            </span>
            <span
              aria-hidden
              className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                unnecessary ? "border-brand bg-brand text-on-brand" : "border-faint"
              }`}
            >
              {unnecessary && <span className="size-2 rounded-full bg-on-brand" />}
            </span>
          </button>
        )}

        <div className="flex flex-col gap-2 pt-1">
          <button type="submit" className={primaryButton}>
            {t.form.save}
          </button>
          {existing && (
            <div className={`grid gap-2 ${fromBank ? "grid-cols-2" : "grid-cols-1"}`}>
              {fromBank && (
                <button type="button" onClick={closeSheet} className={ghostButton}>
                  {t.form.later}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (!confirmDelete) return setConfirmDelete(true);
                  deleteTransaction(existing.id);
                  closeSheet();
                }}
                className={confirmDelete ? dangerButton : ghostButton}
              >
                <Trash size={18} aria-hidden />
                {confirmDelete ? t.form.confirmDelete : t.form.delete}
              </button>
            </div>
          )}
        </div>
      </form>
    </Sheet>
  );
}
