"use client";

import { CaretLeft, CaretRight, ChartDonut } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
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
import { formatNumber } from "@/lib/format";
import type { CategoryId, Transaction } from "@/lib/types";
import { CategoryIcon } from "./category-icon";
import { Money } from "./money";
import { useStore } from "./store";
import { TransactionRow } from "./transaction-row";
import { chipClass, primaryButton } from "./ui";

const sum = (txs: Transaction[]) => txs.reduce((s, tx) => s + tx.amount, 0);

export function MonthView() {
  const { t, settings, transactions, selectedDay, setSelectedDay, openSheet } = useStore();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<"titles" | "entries">("titles");
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
    const income = inMonth.filter((tx) => tx.kind === "income");

    const perDay = new Map<string, number>();
    for (const tx of expenses) {
      const key = dayKey(new Date(tx.at));
      perDay.set(key, (perDay.get(key) ?? 0) + tx.amount);
    }

    const perCategory = new Map<CategoryId, number>();
    for (const tx of expenses) perCategory.set(tx.category, (perCategory.get(tx.category) ?? 0) + tx.amount);

    const perTitle = new Map<string, { title: string; category: CategoryId; total: number; count: number }>();
    for (const tx of expenses) {
      const key = tx.title.trim() || "\u0000";
      const entry = perTitle.get(key) ?? { title: tx.title.trim(), category: tx.category, total: 0, count: 0 };
      entry.total += tx.amount;
      entry.count += 1;
      perTitle.set(key, entry);
    }

    const byDay = new Map<string, Transaction[]>();
    for (const tx of [...inMonth].sort((a, b) => b.at - a.at)) {
      const key = dayKey(new Date(tx.at));
      byDay.set(key, [...(byDay.get(key) ?? []), tx]);
    }

    return {
      count: inMonth.length,
      spent: sum(expenses),
      received: sum(income),
      perDay,
      categories: [...perCategory.entries()].sort((a, b) => b[1] - a[1]),
      titles: [...perTitle.values()].sort((a, b) => b.total - a.total),
      byDay: [...byDay.entries()],
    };
  }, [days, transactions]);

  const maxDay = Math.max(1, ...data.perDay.values());
  const elapsed = isCurrentMonth ? days.indexOf(today) + 1 : days.length;
  const average = data.spent / Math.max(1, elapsed);

  function goMonth(direction: 1 | -1) {
    const first = shiftMonth(selectedDay, locale, direction);
    setSelectedDay(sameMonth(first, today, locale) ? today : first);
  }

  function openDay(day: string) {
    setSelectedDay(day);
    router.push("/app");
  }

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
                          <span className="truncate text-sm font-semibold">{t.categories[category]}</span>
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

          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <h2 className="font-bold">{t.month.bought}</h2>
              <div className="flex gap-2">
                <button type="button" aria-pressed={tab === "titles"} onClick={() => setTab("titles")} className={chipClass(tab === "titles")}>
                  {t.month.groupByTitle}
                </button>
                <button type="button" aria-pressed={tab === "entries"} onClick={() => setTab("entries")} className={chipClass(tab === "entries")}>
                  {t.month.allEntries}
                </button>
              </div>
            </div>

            {tab === "titles" ? (
              <ul className="flex flex-col gap-1">
                {data.titles.map((item) => (
                  <li key={item.title || "untitled"} className="flex items-center gap-3 py-2">
                    <span
                      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-2xl ${
                        item.title ? "bg-sunken" : "bg-brand-soft text-brand-ink"
                      }`}
                    >
                      <CategoryIcon category={item.category} />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className={`truncate font-semibold ${item.title ? "" : "text-brand-ink"}`}>
                        {item.title || t.day.untitled}
                      </span>
                      <span className="text-xs text-muted">{t.month.times(formatNumber(item.count, locale))}</span>
                    </div>
                    <Money value={item.total} className="shrink-0 font-bold" />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col gap-5">
                {data.byDay.map(([day, txs]) => (
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
                      <TransactionRow key={tx.id} tx={tx} />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
