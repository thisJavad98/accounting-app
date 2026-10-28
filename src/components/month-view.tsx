"use client";

import { CaretLeft, CaretRight, ChartDonut, PiggyBank, Plus, Prohibit, Trash } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  dayKey,
  formatDayLong,
  formatDayNumber,
  formatMonth,
  monthDays,
  sameMonth,
  shiftMonth,
  todayKey,
} from "@/lib/dates";
import { categoryLabel } from "@/lib/categories";
import { formatNumber } from "@/lib/format";
import type { CategoryId, Transaction } from "@/lib/types";
import { CategoryIcon } from "./category-icon";
import { Money } from "./money";
import { useStore } from "./store";
import { TransactionRow } from "./transaction-row";
import { chipClass, dangerButton, primaryButton, secondaryButton } from "./ui";

const sum = (txs: Transaction[]) => txs.reduce((s, tx) => s + tx.amount, 0);

type TitleGroup = {
  key: string;
  title: string;
  category: CategoryId;
  total: number;
  count: number;
  ids: string[];
  allUnnecessary: boolean;
};

export function MonthView() {
  const {
    t,
    settings,
    transactions,
    selectedDay,
    setSelectedDay,
    openSheet,
    toggleUnnecessary,
    deleteTransactions,
  } = useStore();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<"titles" | "entries" | "unnecessary">("titles");
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const locale = settings.locale;
  const today = todayKey();
  const rtl = locale === "fa";
  const Prev = rtl ? CaretRight : CaretLeft;
  const Next = rtl ? CaretLeft : CaretRight;

  const days = useMemo(() => monthDays(selectedDay, locale), [selectedDay, locale]);
  const isCurrentMonth = sameMonth(selectedDay, today, locale);

  const data = useMemo(() => {
    const daySet = new Set(days);
    const inMonth = transactions.filter((tx) => daySet.has(dayKey(new Date(tx.at))));
    const expenses = inMonth.filter((tx) => tx.kind === "expense");
    const income = inMonth.filter((tx) => tx.kind === "income").sort((a, b) => b.at - a.at);
    const unnecessaryTxs = expenses.filter((tx) => tx.unnecessary);

    const perDay = new Map<string, number>();
    for (const tx of expenses) {
      const key = dayKey(new Date(tx.at));
      perDay.set(key, (perDay.get(key) ?? 0) + tx.amount);
    }

    const perCategory = new Map<CategoryId, number>();
    for (const tx of expenses) perCategory.set(tx.category, (perCategory.get(tx.category) ?? 0) + tx.amount);

    const perTitle = new Map<string, TitleGroup>();
    for (const tx of expenses) {
      const key = tx.title.trim() || "\u0000";
      const entry = perTitle.get(key) ?? {
        key,
        title: tx.title.trim(),
        category: tx.category,
        total: 0,
        count: 0,
        ids: [],
        allUnnecessary: true,
      };
      entry.total += tx.amount;
      entry.count += 1;
      entry.ids.push(tx.id);
      if (!tx.unnecessary) entry.allUnnecessary = false;
      perTitle.set(key, entry);
    }

    const byDay = new Map<string, Transaction[]>();
    for (const tx of [...inMonth].sort((a, b) => b.at - a.at)) {
      const key = dayKey(new Date(tx.at));
      byDay.set(key, [...(byDay.get(key) ?? []), tx]);
    }

    const unnecessaryByDay = new Map<string, Transaction[]>();
    for (const tx of [...unnecessaryTxs].sort((a, b) => b.at - a.at)) {
      const key = dayKey(new Date(tx.at));
      unnecessaryByDay.set(key, [...(unnecessaryByDay.get(key) ?? []), tx]);
    }

    const spent = sum(expenses);
    const received = sum(income);
    const unnecessarySpent = sum(unnecessaryTxs);
    const necessarySpent = Math.max(0, spent - unnecessarySpent);

    return {
      count: inMonth.length,
      expenseCount: expenses.length,
      spent,
      received,
      unnecessarySpent,
      necessarySpent,
      unnecessaryIds: unnecessaryTxs.map((tx) => tx.id),
      income,
      perDay,
      categories: [...perCategory.entries()].sort((a, b) => b[1] - a[1]),
      titles: [...perTitle.values()].sort((a, b) => b.total - a.total),
      byDay: [...byDay.entries()],
      unnecessaryByDay: [...unnecessaryByDay.entries()],
    };
  }, [days, transactions]);

  const maxDay = Math.max(1, ...data.perDay.values());
  const elapsed = isCurrentMonth ? days.indexOf(today) + 1 : days.length;
  const average = data.spent / Math.max(1, elapsed);
  const activeTab = tab === "unnecessary" && data.unnecessaryIds.length === 0 ? "titles" : tab;

  // Money user can save: if income is logged, it's remaining income after only necessary buys
  // (plus at least the cut unnecessary amount if expenses exceeded income).
  const canSave =
    data.received > 0
      ? Math.max(data.unnecessarySpent, data.received - data.necessarySpent)
      : data.unnecessarySpent;
  const savingsPct =
    data.received > 0 ? Math.min(100, Math.max(0, Math.round((canSave / data.received) * 100))) : null;

  function goMonth(direction: 1 | -1) {
    setConfirmBulkDelete(false);
    const first = shiftMonth(selectedDay, locale, direction);
    setSelectedDay(sameMonth(first, today, locale) ? today : first);
  }

  function openDay(day: string) {
    setSelectedDay(day);
    router.push("/app");
  }

  function addSalaryOrIncome() {
    openSheet({ type: "tx", id: null, kind: "income", category: "salary" });
  }

  const totalBase = Math.max(1, data.received, data.spent);
  const necessaryShare = Math.min(100, (data.necessarySpent / totalBase) * 100);
  const cutShare = Math.min(100 - necessaryShare, (data.unnecessarySpent / totalBase) * 100);

  return (
    <div className="flex flex-col gap-8 px-5 pt-[max(env(safe-area-inset-top),1.5rem)]">
      <header className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={t.month.prevMonth}
          onClick={() => goMonth(-1)}
          className="inline-flex size-10 items-center justify-center rounded-full bg-sunken text-ink active:scale-95"
        >
          <Prev size={18} aria-hidden />
        </button>
        <h1 className="text-lg font-bold tracking-tight">{formatMonth(selectedDay, locale)}</h1>
        <button
          type="button"
          aria-label={t.month.nextMonth}
          disabled={isCurrentMonth}
          onClick={() => goMonth(1)}
          className="inline-flex size-10 items-center justify-center rounded-full bg-sunken text-ink active:scale-95 disabled:opacity-30"
        >
          <Next size={18} aria-hidden />
        </button>
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">{t.month.spent}</p>
          <Money value={data.spent} className="text-4xl font-black tracking-tight" unitClassName="text-base font-semibold text-muted" />
        </div>
        <dl className="grid grid-cols-3 gap-2">
          {[
            { label: t.month.income, value: data.received, sign: "+" as const },
            { label: t.month.net, value: Math.abs(data.received - data.spent), sign: data.received - data.spent < 0 ? ("-" as const) : undefined },
            { label: t.month.avgDay, value: Math.round(average) },
          ].map((item) => (
            <div key={item.label} className="flex flex-col gap-1 rounded-2xl bg-sunken px-3 py-3">
              <dt className="text-xs font-medium text-muted">{item.label}</dt>
              <dd>
                <Money value={item.value} sign={item.sign} className="flex-wrap text-sm font-bold" unitClassName="text-[10px] font-medium text-muted" />
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {data.count === 0 ? (
        <section className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-line px-5 py-7">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-sunken text-muted">
            <ChartDonut size={26} weight="duotone" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="font-bold">{t.month.emptyTitle}</h2>
            <p className="text-sm leading-relaxed text-muted">{t.month.emptyBody}</p>
          </div>
          <button type="button" onClick={() => openSheet({ type: "add" })} className={`${primaryButton} h-11 w-auto px-5 text-sm`}>
            {t.nav.add}
          </button>
        </section>
      ) : (
        <>
          {/* Monthly Salary & Savings Optimizer */}
          <section className="flex flex-col gap-4 rounded-2xl bg-sunken p-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink">
                <PiggyBank size={24} weight="duotone" aria-hidden />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <h2 className="font-bold">{t.month.savingsTitle}</h2>
                <p className="text-xs leading-relaxed text-muted">{t.month.savingsSubtitle}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-2xl bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted">{t.month.canSave}</span>
                {savingsPct !== null && (
                  <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand-ink tabular-nums">
                    {t.month.savingsRate(formatNumber(savingsPct, locale))}
                  </span>
                )}
              </div>
              <Money
                value={canSave}
                sign={canSave > 0 ? "+" : undefined}
                className="text-3xl font-black tracking-tight text-brand-ink"
                unitClassName="text-sm font-semibold text-muted"
              />
              {data.unnecessarySpent > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs font-semibold text-brand-ink">
                  <span>{t.month.savedFromCuts}:</span>
                  <Money
                    value={data.unnecessarySpent}
                    sign="+"
                    className="font-bold"
                    unitClassName="text-[10px]"
                  />
                </div>
              )}

              <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-sunken" aria-hidden>
                {necessaryShare > 0 && (
                  <div
                    className="h-full bg-ink/40 transition-all duration-300"
                    style={{ width: `${necessaryShare}%` }}
                  />
                )}
                {cutShare > 0 && (
                  <div
                    className="h-full bg-brand transition-all duration-300"
                    style={{ width: `${cutShare}%` }}
                  />
                )}
              </div>

              <dl className="mt-1 grid grid-cols-2 gap-2 pt-1">
                <div className="flex flex-col gap-0.5 rounded-xl bg-sunken px-3 py-2">
                  <dt className="text-[11px] font-medium text-muted">{t.month.necessaryBuys}</dt>
                  <dd>
                    <Money value={data.necessarySpent} className="text-sm font-bold" unitClassName="text-[10px] text-muted" />
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5 rounded-xl bg-brand-soft px-3 py-2 text-brand-ink">
                  <dt className="text-[11px] font-medium opacity-80">{t.month.unnecessaryBuys}</dt>
                  <dd>
                    <Money value={data.unnecessarySpent} className="text-sm font-bold" unitClassName="text-[10px] opacity-75" />
                  </dd>
                </div>
              </dl>
            </div>

            {data.unnecessaryIds.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  if (!confirmBulkDelete) {
                    setConfirmBulkDelete(true);
                    return;
                  }
                  const countStr = formatNumber(data.unnecessaryIds.length, locale);
                  deleteTransactions(data.unnecessaryIds, t.month.unnecessaryDeleted(countStr));
                  setConfirmBulkDelete(false);
                }}
                className={`${confirmBulkDelete ? dangerButton : secondaryButton} h-11 bg-surface text-sm`}
              >
                <Trash size={17} aria-hidden />
                {confirmBulkDelete
                  ? t.month.confirmDeleteUnnecessary(formatNumber(data.unnecessaryIds.length, locale))
                  : t.month.deleteUnnecessary(formatNumber(data.unnecessaryIds.length, locale))}
              </button>
            ) : (
              <p className="text-xs leading-relaxed text-muted">{t.month.noUnnecessaryYet}</p>
            )}
            <Link
              href={`/app/reports/${days[0]}`}
              className={`${primaryButton} h-11 text-sm`}
            >
              <PiggyBank size={18} weight="bold" aria-hidden />
              {t.month.openFullReport}
            </Link>
          </section>

          {/* Incoming Money & Salary Section */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold">{t.month.incomingTitle}</h2>
              <button
                type="button"
                onClick={addSalaryOrIncome}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-brand-soft px-3 text-xs font-bold text-brand-ink active:scale-95"
              >
                <Plus size={14} weight="bold" aria-hidden />
                {t.month.addIncome}
              </button>
            </div>
            {data.income.length > 0 ? (
              <ul className="flex flex-col">
                {data.income.map((tx) => (
                  <li key={tx.id}>
                    <TransactionRow tx={tx} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-line px-4 py-3.5">
                <p className="text-xs leading-relaxed text-muted">{t.month.noIncomeHint}</p>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-bold">{t.month.daily}</h2>
            <div className="flex h-32 items-end gap-[3px]">
              {days.map((day, i) => {
                const value = data.perDay.get(day) ?? 0;
                const isToday = day === today;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => openDay(day)}
                    aria-label={`${formatDayLong(day, locale)}: ${formatNumber(value, locale)}`}
                    className="group flex h-full flex-1 items-end"
                  >
                    <motion.span
                      className={`block w-full origin-bottom rounded-full ${
                        value ? (isToday ? "bg-brand" : "bg-brand/45 group-active:bg-brand") : "bg-line"
                      }`}
                      style={{ height: value ? `${Math.max(6, (value / maxDay) * 100)}%` : 3 }}
                      initial={reduce ? false : { scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ type: "spring", stiffness: 160, damping: 22, delay: i * 0.012 }}
                    />
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-muted tabular-nums">
              <span>{formatDayNumber(days[0], locale)}</span>
              <span>{formatDayNumber(days[days.length - 1], locale)}</span>
            </div>
          </section>

          {data.categories.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="font-bold">{t.month.byCategory}</h2>
              <ul className="flex flex-col gap-4">
                {data.categories.map(([category, total]) => {
                  const share = total / Math.max(1, data.spent);
                  return (
                    <li key={category} className="flex items-center gap-3">
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-sunken">
                        <CategoryIcon category={category} />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-semibold">
                            {categoryLabel(category, t.categories, settings.customCategories)}
                          </span>
                          <Money value={total} className="text-sm font-bold" unitClassName="text-[10px] text-muted" />
                        </div>
                        <div className="flex items-center gap-2">
                          <motion.span
                            className="block h-1.5 rounded-full bg-brand"
                            style={{ width: `${Math.max(2, share * 100)}%`, transformOrigin: rtl ? "right" : "left" }}
                            initial={reduce ? false : { scaleX: 0 }}
                            whileInView={{ scaleX: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                          />
                          <span className="shrink-0 text-xs text-muted tabular-nums">
                            {formatNumber(Math.round(share * 100), locale)}%
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {data.expenseCount > 0 && (
            <section className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h2 className="font-bold">{t.month.bought}</h2>
                <p className="text-xs leading-relaxed text-muted">{t.month.boughtHint}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    aria-pressed={activeTab === "titles"}
                    onClick={() => setTab("titles")}
                    className={chipClass(activeTab === "titles")}
                  >
                    {t.month.groupByTitle}
                  </button>
                  <button
                    type="button"
                    aria-pressed={activeTab === "entries"}
                    onClick={() => setTab("entries")}
                    className={chipClass(activeTab === "entries")}
                  >
                    {t.month.allEntries}
                  </button>
                  {data.unnecessaryIds.length > 0 && (
                    <button
                      type="button"
                      aria-pressed={activeTab === "unnecessary"}
                      onClick={() => setTab("unnecessary")}
                      className={chipClass(activeTab === "unnecessary")}
                    >
                      {t.month.onlyUnnecessary} ({formatNumber(data.unnecessaryIds.length, locale)})
                    </button>
                  )}
                </div>
              </div>

              {activeTab === "titles" ? (
                <ul className="flex flex-col gap-1">
                  {data.titles.map((item) => (
                    <li key={item.key} className="flex items-center gap-2.5 py-2">
                      <span
                        className={`inline-flex size-10 shrink-0 items-center justify-center rounded-2xl ${
                          item.allUnnecessary
                            ? "bg-brand-soft text-brand-ink"
                            : item.title
                              ? "bg-sunken"
                              : "bg-brand-soft text-brand-ink"
                        }`}
                      >
                        <CategoryIcon category={item.category} />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span
                          className={`truncate font-semibold ${
                            item.allUnnecessary ? "line-through opacity-60" : item.title ? "" : "text-brand-ink"
                          }`}
                        >
                          {item.title || t.day.untitled}
                        </span>
                        <span className="text-xs text-muted">{t.month.times(formatNumber(item.count, locale))}</span>
                      </div>
                      <Money
                        value={item.total}
                        className={`shrink-0 font-bold ${item.allUnnecessary ? "line-through opacity-55" : ""}`}
                      />
                      <button
                        type="button"
                        aria-pressed={item.allUnnecessary}
                        onClick={() => toggleUnnecessary(item.ids, !item.allUnnecessary)}
                        className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition-colors active:scale-95 ${
                          item.allUnnecessary ? "bg-brand text-on-brand" : "bg-sunken text-muted"
                        }`}
                      >
                        <Prohibit size={13} weight={item.allUnnecessary ? "bold" : "regular"} aria-hidden />
                        {item.allUnnecessary ? t.month.unmarkUnnecessary : t.month.markUnnecessary}
                      </button>
                      {item.allUnnecessary && (
                        <button
                          type="button"
                          aria-label={t.form.delete}
                          onClick={() => deleteTransactions(item.ids)}
                          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger active:scale-95"
                        >
                          <Trash size={14} aria-hidden />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col gap-5">
                  {(activeTab === "unnecessary" ? data.unnecessaryByDay : data.byDay).map(([day, txs]) => (
                    <div key={day} className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => openDay(day)}
                        className="self-start text-xs font-semibold text-muted underline-offset-4 hover:underline"
                        aria-label={`${t.month.openDay}: ${formatDayLong(day, locale)}`}
                      >
                        {formatDayLong(day, locale)}
                      </button>
                      {txs.map((tx) => (
                        <TransactionRow key={tx.id} tx={tx} showUnnecessaryAction />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
