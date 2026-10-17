"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  CaretLeft,
  CaretRight,
  PiggyBank,
  Prohibit,
  Sparkle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  dayKey,
  formatMonth,
  monthDays,
  sameMonth,
  shiftMonth,
  todayKey,
  type DayKey,
} from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import type { Transaction } from "@/lib/types";
import { Money } from "./money";
import { useStore } from "./store";
import { chipClass, primaryButton } from "./ui";

const sum = (txs: Transaction[]) => txs.reduce((s, tx) => s + tx.amount, 0);

type MonthReportSummary = {
  startDay: DayKey;
  label: string;
  isCurrent: boolean;
  isLatestWithData: boolean;
  incomeTotal: number;
  incomeCount: number;
  expenseTotal: number;
  expenseCount: number;
  unnecessaryTotal: number;
  unnecessaryCount: number;
  necessaryTotal: number;
  canSave: number;
  savingsPct: number | null;
  totalCount: number;
};

export function ReportsView() {
  const { t, settings, transactions, setSelectedDay } = useStore();
  const locale = settings.locale;
  const today = todayKey();
  const Chevron = locale === "fa" ? CaretLeft : CaretRight;

  const months = useMemo<MonthReportSummary[]>(() => {
    const startSet = new Set<DayKey>();

    // Always include the latest 6 calendar months ending at today's month
    let cursor = monthDays(today, locale)[0];
    for (let i = 0; i < 6; i++) {
      startSet.add(cursor);
      cursor = shiftMonth(cursor, locale, -1);
    }

    // Also include any month that has transactions
    for (const tx of transactions) {
      const dKey = dayKey(new Date(tx.at));
      const mStart = monthDays(dKey, locale)[0];
      startSet.add(mStart);
    }

    const sortedStarts = [...startSet].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

    const summaries = sortedStarts.map((startDay) => {
      const days = new Set(monthDays(startDay, locale));
      const inMonth = transactions.filter((tx) => days.has(dayKey(new Date(tx.at))));
      const income = inMonth.filter((tx) => tx.kind === "income");
      const expenses = inMonth.filter((tx) => tx.kind === "expense");
      const unnecessary = expenses.filter((tx) => tx.unnecessary);

      const incomeTotal = sum(income);
      const expenseTotal = sum(expenses);
      const unnecessaryTotal = sum(unnecessary);
      const necessaryTotal = Math.max(0, expenseTotal - unnecessaryTotal);

      const canSave =
        incomeTotal > 0
          ? Math.max(unnecessaryTotal, incomeTotal - necessaryTotal)
          : unnecessaryTotal;
      const savingsPct =
        incomeTotal > 0 ? Math.min(100, Math.max(0, Math.round((canSave / incomeTotal) * 100))) : null;

      return {
        startDay,
        label: formatMonth(startDay, locale),
        isCurrent: sameMonth(startDay, today, locale),
        isLatestWithData: false,
        incomeTotal,
        incomeCount: income.length,
        expenseTotal,
        expenseCount: expenses.length,
        unnecessaryTotal,
        unnecessaryCount: unnecessary.length,
        necessaryTotal,
        canSave,
        savingsPct,
        totalCount: inMonth.length,
      };
    });

    const latestIdx = summaries.findIndex((s) => s.totalCount > 0);
    if (latestIdx !== -1) summaries[latestIdx].isLatestWithData = true;

    return summaries;
  }, [today, locale, transactions]);

  const defaultSelected = useMemo(
    () => months.find((m) => m.isLatestWithData)?.startDay ?? months[0]?.startDay ?? today,
    [months, today],
  );

  const [selectedStart, setSelectedStart] = useState<DayKey>(defaultSelected);
  const activeMonth = useMemo(
    () => months.find((m) => m.startDay === selectedStart) ?? months[0],
    [months, selectedStart],
  );

  return (
    <div className="flex flex-col gap-7 px-5 pt-[max(env(safe-area-inset-top),1.5rem)]">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-black tracking-tight">{t.reports.title}</h1>
        <p className="text-sm leading-relaxed text-muted">{t.reports.subtitle}</p>
      </header>

      {/* Latest Month Selector Strip */}
      <section className="flex flex-col gap-2.5">
        <h2 className="text-xs font-bold text-muted">{t.reports.latestMonths}</h2>
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 py-0.5">
          {months.map((m) => {
            const active = m.startDay === activeMonth?.startDay;
            return (
              <button
                key={m.startDay}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedStart(m.startDay)}
                className={chipClass(active)}
              >
                <span>{m.label}</span>
                {m.isLatestWithData && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      active ? "bg-on-brand/20 text-on-brand" : "bg-brand-soft text-brand-ink"
                    }`}
                  >
                    {t.reports.latestBadge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Selected Month Highlight Card */}
      {activeMonth && (
        <section className="flex flex-col gap-4 rounded-2xl bg-sunken p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-on-brand">
                <PiggyBank size={24} weight="duotone" aria-hidden />
              </span>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black tracking-tight">{activeMonth.label}</h2>
                  {activeMonth.isCurrent && (
                    <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand-ink">
                      {t.reports.currentBadge}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted">
                  {t.reports.summaryCount(
                    formatNumber(activeMonth.incomeCount, locale),
                    formatNumber(activeMonth.expenseCount, locale),
                  )}
                </span>
              </div>
            </div>
            {activeMonth.savingsPct !== null && (
              <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-ink tabular-nums">
                {t.reports.savingsRate(formatNumber(activeMonth.savingsPct, locale))}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted">{t.reports.canSave}</span>
              <Money
                value={activeMonth.canSave}
                sign={activeMonth.canSave > 0 ? "+" : undefined}
                className="text-3xl font-black tracking-tight text-brand-ink"
                unitClassName="text-sm font-semibold text-muted"
              />
            </div>

            <dl className="grid grid-cols-2 gap-2 pt-1">
              <div className="flex flex-col gap-1 rounded-xl bg-sunken px-3 py-2.5">
                <dt className="flex items-center gap-1 text-xs font-medium text-muted">
                  <ArrowDownLeft size={14} weight="bold" className="text-brand" aria-hidden />
                  {t.reports.incoming}
                </dt>
                <dd>
                  <Money
                    value={activeMonth.incomeTotal}
                    sign={activeMonth.incomeTotal > 0 ? "+" : undefined}
                    className="text-sm font-bold text-brand-ink"
                    unitClassName="text-[10px] text-muted"
                  />
                </dd>
              </div>
              <div className="flex flex-col gap-1 rounded-xl bg-sunken px-3 py-2.5">
                <dt className="flex items-center gap-1 text-xs font-medium text-muted">
                  <ArrowUpRight size={14} weight="bold" aria-hidden />
                  {t.reports.buys}
                </dt>
                <dd>
                  <Money
                    value={activeMonth.expenseTotal}
                    className="text-sm font-bold"
                    unitClassName="text-[10px] text-muted"
                  />
                </dd>
              </div>
            </dl>

            <dl className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5 rounded-xl bg-sunken px-3 py-2">
                <dt className="text-[11px] font-medium text-muted">{t.reports.necessary}</dt>
                <dd>
                  <Money
                    value={activeMonth.necessaryTotal}
                    className="text-xs font-bold"
                    unitClassName="text-[10px] text-muted"
                  />
                </dd>
              </div>
              <div className="flex flex-col gap-0.5 rounded-xl bg-brand-soft px-3 py-2 text-brand-ink">
                <dt className="flex items-center gap-1 text-[11px] font-medium opacity-85">
                  <Prohibit size={12} weight="bold" aria-hidden />
                  {t.reports.unnecessary}
                </dt>
                <dd>
                  <Money
                    value={activeMonth.unnecessaryTotal}
                    className="text-xs font-bold"
                    unitClassName="text-[10px] opacity-75"
                  />
                </dd>
              </div>
            </dl>
          </div>

          <Link
            href={`/app/reports/${activeMonth.startDay}`}
            onClick={() => setSelectedDay(activeMonth.startDay)}
            className={`${primaryButton} h-12 text-sm`}
          >
            <Sparkle size={18} weight="fill" aria-hidden />
            {t.reports.openDetail}
            <Chevron size={16} weight="bold" aria-hidden />
          </Link>
        </section>
      )}

      {/* All Monthly Reports List */}
      <section className="flex flex-col gap-3">
        <h2 className="font-bold">{t.reports.latestMonths}</h2>
        <ul className="flex flex-col gap-2.5">
          {months.map((m) => (
            <li key={m.startDay}>
              <Link
                href={`/app/reports/${m.startDay}`}
                onClick={() => setSelectedDay(m.startDay)}
                className="flex items-center justify-between gap-3 rounded-2xl bg-sunken p-4 transition-transform active:scale-[0.99]"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{m.label}</span>
                    {m.isLatestWithData && (
                      <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand-ink">
                        {t.reports.latestBadge}
                      </span>
                    )}
                    {m.unnecessaryCount > 0 && (
                      <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted">
                        {t.reports.unnecessaryCount(formatNumber(m.unnecessaryCount, locale))}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      {t.month.income}:
                      <Money
                        value={m.incomeTotal}
                        sign={m.incomeTotal > 0 ? "+" : undefined}
                        className="font-semibold text-ink"
                        unitClassName="text-[10px] text-muted"
                      />
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {t.reports.buys}:
                      <Money
                        value={m.expenseTotal}
                        className="font-semibold text-ink"
                        unitClassName="text-[10px] text-muted"
                      />
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-medium text-muted">{t.reports.canSave}</span>
                    <Money
                      value={m.canSave}
                      sign={m.canSave > 0 ? "+" : undefined}
                      className="text-sm font-black text-brand-ink"
                      unitClassName="text-[10px] text-muted"
                    />
                  </div>
                  <Chevron size={18} className="text-faint" aria-hidden />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
