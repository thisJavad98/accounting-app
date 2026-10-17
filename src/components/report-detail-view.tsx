"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  CaretLeft,
  CaretRight,
  PiggyBank,
  Plus,
  Prohibit,
  Trash,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  dayKey,
  formatDayLong,
  formatMonth,
  monthDays,
  sameMonth,
  shiftMonth,
  todayKey,
  type DayKey,
} from "@/lib/dates";
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

function resolveMonthDay(param: string, fallback: DayKey): DayKey {
  if (/^\d{4}-\d{2}-\d{2}$/.test(param)) return param;
  return fallback;
}

export function ReportDetailView({ monthParam }: { monthParam: string }) {
  const {
    t,
    settings,
    transactions,
    setSelectedDay,
    openSheet,
    toggleUnnecessary,
    deleteTransaction,
    deleteTransactions,
  } = useStore();
  const router = useRouter();
  const locale = settings.locale;
  const today = todayKey();
  const rtl = locale === "fa";
  const Prev = rtl ? CaretRight : CaretLeft;
  const Next = rtl ? CaretLeft : CaretRight;

  const days = useMemo(
    () => monthDays(resolveMonthDay(monthParam, today), locale),
    [monthParam, today, locale],
  );
  const monthStartDay = days[0];
  const isCurrentMonth = sameMonth(monthStartDay, today, locale);

  const [tab, setTab] = useState<"all" | "titles" | "unnecessary">("all");
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const data = useMemo(() => {
    const daySet = new Set(days);
    const inMonth = transactions.filter((tx) => daySet.has(dayKey(new Date(tx.at))));
    const income = inMonth.filter((tx) => tx.kind === "income").sort((a, b) => b.at - a.at);
    const expenses = inMonth.filter((tx) => tx.kind === "expense").sort((a, b) => b.at - a.at);
    const unnecessaryTxs = expenses.filter((tx) => tx.unnecessary);

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

    const expensesByDay = new Map<string, Transaction[]>();
    for (const tx of expenses) {
      const key = dayKey(new Date(tx.at));
      expensesByDay.set(key, [...(expensesByDay.get(key) ?? []), tx]);
    }

    const unnecessaryByDay = new Map<string, Transaction[]>();
    for (const tx of unnecessaryTxs) {
      const key = dayKey(new Date(tx.at));
      unnecessaryByDay.set(key, [...(unnecessaryByDay.get(key) ?? []), tx]);
    }

    const incomeTotal = sum(income);
    const expenseTotal = sum(expenses);
    const unnecessaryTotal = sum(unnecessaryTxs);
    const necessaryTotal = Math.max(0, expenseTotal - unnecessaryTotal);

    return {
      totalCount: inMonth.length,
      income,
      expenses,
      unnecessaryTxs,
      unnecessaryIds: unnecessaryTxs.map((tx) => tx.id),
      incomeTotal,
      expenseTotal,
      unnecessaryTotal,
      necessaryTotal,
      titles: [...perTitle.values()].sort((a, b) => b.total - a.total),
      expensesByDay: [...expensesByDay.entries()],
      unnecessaryByDay: [...unnecessaryByDay.entries()],
    };
  }, [days, transactions]);

  const currentLeftover = data.incomeTotal - data.expenseTotal;
  const canSave =
    data.incomeTotal > 0
      ? Math.max(data.unnecessaryTotal, data.incomeTotal - data.necessaryTotal)
      : data.unnecessaryTotal;
  const savingsPct =
    data.incomeTotal > 0
      ? Math.min(100, Math.max(0, Math.round((canSave / data.incomeTotal) * 100)))
      : null;

  const activeTab = tab === "unnecessary" && data.unnecessaryIds.length === 0 ? "all" : tab;

  const totalBase = Math.max(1, data.incomeTotal, data.expenseTotal);
  const necessaryShare = Math.min(100, (data.necessaryTotal / totalBase) * 100);
  const cutShare = Math.min(100 - necessaryShare, (data.unnecessaryTotal / totalBase) * 100);

  function goMonth(direction: 1 | -1) {
    setConfirmDeleteAll(false);
    const nextStart = shiftMonth(monthStartDay, locale, direction);
    setSelectedDay(sameMonth(nextStart, today, locale) ? today : nextStart);
    router.push(`/app/reports/${nextStart}`);
  }

  function addIncomeForMonth() {
    setSelectedDay(isCurrentMonth ? today : days[days.length - 1]);
    openSheet({ type: "tx", id: null, kind: "income", category: "salary" });
  }

  function addExpenseForMonth() {
    setSelectedDay(isCurrentMonth ? today : days[days.length - 1]);
    openSheet({ type: "tx", id: null, kind: "expense" });
  }

  return (
    <div className="flex flex-col gap-7 px-5 pt-[max(env(safe-area-inset-top),1.5rem)]">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/app/reports"
          className="inline-flex h-10 items-center gap-1 rounded-full bg-sunken ps-2.5 pe-4 text-sm font-medium text-ink active:scale-[0.97]"
        >
          <CaretLeft size={16} weight="bold" className="rtl:rotate-180" aria-hidden />
          {t.reports.backToReports}
        </Link>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label={t.month.prevMonth}
            onClick={() => goMonth(-1)}
            className="inline-flex size-9 items-center justify-center rounded-full bg-sunken text-ink active:scale-95"
          >
            <Prev size={16} aria-hidden />
          </button>
          <button
            type="button"
            aria-label={t.month.nextMonth}
            disabled={isCurrentMonth}
            onClick={() => goMonth(1)}
            className="inline-flex size-9 items-center justify-center rounded-full bg-sunken text-ink active:scale-95 disabled:opacity-30"
          >
            <Next size={16} aria-hidden />
          </button>
        </div>
      </div>

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight">
          {t.reports.reportOf(formatMonth(monthStartDay, locale))}
        </h1>
        <p className="text-sm leading-relaxed text-muted">{t.month.savingsSubtitle}</p>
      </header>

      {/* Main Savings Summary Hero Card */}
      <section className="flex flex-col gap-4 rounded-2xl bg-sunken p-4">
        <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-ink">
              <PiggyBank size={18} weight="duotone" aria-hidden />
              {t.reports.canSave}
            </span>
            {savingsPct !== null && (
              <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand-ink tabular-nums">
                {t.reports.savingsRate(formatNumber(savingsPct, locale))}
              </span>
            )}
          </div>

          <Money
            value={canSave}
            sign={canSave > 0 ? "+" : undefined}
            className="text-4xl font-black tracking-tight text-brand-ink"
            unitClassName="text-base font-semibold text-muted"
          />

          {data.unnecessaryTotal > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-brand-ink">
              <span>{t.reports.savedFromCuts}:</span>
              <Money value={data.unnecessaryTotal} sign="+" className="font-bold" unitClassName="text-[10px]" />
            </div>
          )}

          {/* Progress Bar */}
          <div className="mt-1 flex h-2.5 w-full overflow-hidden rounded-full bg-sunken" aria-hidden>
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

          <dl className="grid grid-cols-2 gap-2 pt-1">
            <div className="flex flex-col gap-1 rounded-xl bg-sunken px-3 py-2.5">
              <dt className="flex items-center gap-1 text-xs font-medium text-muted">
                <ArrowDownLeft size={14} weight="bold" className="text-brand" aria-hidden />
                {t.reports.incoming}
              </dt>
              <dd>
                <Money
                  value={data.incomeTotal}
                  sign={data.incomeTotal > 0 ? "+" : undefined}
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
                <Money value={data.expenseTotal} className="text-sm font-bold" unitClassName="text-[10px] text-muted" />
              </dd>
            </div>
          </dl>

          <dl className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-0.5 rounded-xl bg-sunken px-3 py-2">
              <dt className="text-[11px] font-medium text-muted">{t.reports.necessary}</dt>
              <dd>
                <Money value={data.necessaryTotal} className="text-sm font-bold" unitClassName="text-[10px] text-muted" />
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 rounded-xl bg-brand-soft px-3 py-2 text-brand-ink">
              <dt className="flex items-center gap-1 text-[11px] font-medium opacity-85">
                <Prohibit size={12} weight="bold" aria-hidden />
                {t.reports.unnecessary}
              </dt>
              <dd>
                <Money value={data.unnecessaryTotal} className="text-sm font-bold" unitClassName="text-[10px] opacity-75" />
              </dd>
            </div>
          </dl>

          {data.incomeTotal > 0 && (
            <div className="flex items-center justify-between border-t border-line pt-2.5 text-xs">
              <span className="text-muted">{t.reports.realLeftover}</span>
              <Money
                value={Math.abs(currentLeftover)}
                sign={currentLeftover < 0 ? "-" : currentLeftover > 0 ? "+" : undefined}
                className="font-bold"
                unitClassName="text-[10px] text-muted"
              />
            </div>
          )}
        </div>

        {data.unnecessaryIds.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              if (!confirmDeleteAll) {
                setConfirmDeleteAll(true);
                return;
              }
              const countStr = formatNumber(data.unnecessaryIds.length, locale);
              deleteTransactions(data.unnecessaryIds, t.reports.deletedToast(countStr));
              setConfirmDeleteAll(false);
            }}
            className={`${confirmDeleteAll ? dangerButton : primaryButton} h-12 text-sm`}
          >
            <Trash size={18} aria-hidden />
            {confirmDeleteAll
              ? t.reports.confirmDeleteAll(formatNumber(data.unnecessaryIds.length, locale))
              : t.reports.deleteAllUnnecessary(formatNumber(data.unnecessaryIds.length, locale))}
          </button>
        ) : (
          <p className="text-xs leading-relaxed text-muted">{t.month.noUnnecessaryYet}</p>
        )}
      </section>

      {/* Incoming Money & Salary Section */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold">{t.reports.incoming}</h2>
          <button
            type="button"
            onClick={addIncomeForMonth}
            className="inline-flex h-8 items-center gap-1 rounded-full bg-brand-soft px-3 text-xs font-bold text-brand-ink active:scale-95"
          >
            <Plus size={14} weight="bold" aria-hidden />
            {t.reports.addIncome}
          </button>
        </div>

        {data.income.length > 0 ? (
          <ul className="flex flex-col rounded-2xl bg-sunken px-3 py-1">
            {data.income.map((tx) => (
              <li key={tx.id}>
                <TransactionRow tx={tx} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-line px-4 py-4">
            <p className="text-xs leading-relaxed text-muted">{t.reports.noIncome}</p>
          </div>
        )}
      </section>

      {/* User's Buys & Unnecessary Cleanup Section */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold">{t.reports.buysListTitle}</h2>
            <button
              type="button"
              onClick={addExpenseForMonth}
              className="inline-flex h-8 items-center gap-1 rounded-full bg-sunken px-3 text-xs font-bold text-ink active:scale-95"
            >
              <Plus size={14} weight="bold" aria-hidden />
              {t.reports.addExpense}
            </button>
          </div>
          <p className="text-xs leading-relaxed text-muted">{t.reports.buysListSubtitle}</p>

          {data.expenses.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                aria-pressed={activeTab === "all"}
                onClick={() => setTab("all")}
                className={chipClass(activeTab === "all")}
              >
                {t.reports.allBuys} ({formatNumber(data.expenses.length, locale)})
              </button>
              <button
                type="button"
                aria-pressed={activeTab === "titles"}
                onClick={() => setTab("titles")}
                className={chipClass(activeTab === "titles")}
              >
                {t.reports.byTitle}
              </button>
              {data.unnecessaryIds.length > 0 && (
                <button
                  type="button"
                  aria-pressed={activeTab === "unnecessary"}
                  onClick={() => setTab("unnecessary")}
                  className={chipClass(activeTab === "unnecessary")}
                >
                  {t.reports.unnecessaryOnly} ({formatNumber(data.unnecessaryIds.length, locale)})
                </button>
              )}
            </div>
          )}
        </div>

        {data.expenses.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-line px-5 py-6">
            <h3 className="font-bold">{t.reports.emptyMonthTitle}</h3>
            <p className="text-xs leading-relaxed text-muted">{t.reports.emptyMonthBody}</p>
            <button
              type="button"
              onClick={addExpenseForMonth}
              className={`${secondaryButton} h-10 w-auto px-4 text-xs`}
            >
              <Plus size={15} weight="bold" aria-hidden />
              {t.reports.addExpense}
            </button>
          </div>
        ) : activeTab === "titles" ? (
          <ul className="flex flex-col gap-1">
            {data.titles.map((item) => (
              <li key={item.key} className="flex items-center gap-2 py-2">
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
                  {item.allUnnecessary ? t.reports.keepNecessary : t.reports.markUnnecessary}
                </button>
                <button
                  type="button"
                  aria-label={t.reports.deleteOne}
                  onClick={() => deleteTransactions(item.ids)}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger active:scale-95"
                >
                  <Trash size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col gap-5">
            {(activeTab === "unnecessary" ? data.unnecessaryByDay : data.expensesByDay).map(([day, txs]) => (
              <div key={day} className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">{formatDayLong(day, locale)}</span>
                {txs.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-1.5">
                    <div className="min-w-0 flex-1">
                      <TransactionRow tx={tx} showUnnecessaryAction />
                    </div>
                    <button
                      type="button"
                      aria-label={t.reports.deleteOne}
                      onClick={() => deleteTransaction(tx.id)}
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger active:scale-95"
                    >
                      <Trash size={14} aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
