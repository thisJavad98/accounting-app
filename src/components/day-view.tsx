"use client";

import { CalendarBlank, CaretDown, CaretLeft, CaretRight, ChatText, NotePencil, Tray } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import {
  addDays,
  dayKey,
  formatDayLong,
  formatDayNumber,
  formatMonth,
  formatWeekdayShort,
  todayKey,
} from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { Money } from "./money";
import { useStore } from "./store";
import { TransactionRow } from "./transaction-row";
import { primaryButton, secondaryButton } from "./ui";
import { LogoMark } from "./logo";

export function DayView() {
  const { t, settings, transactions, selectedDay, setSelectedDay, openSheet } = useStore();
  const reduce = useReducedMotion();
  const locale = settings.locale;
  const today = todayKey();
  const rtl = locale === "fa";
  const Prev = rtl ? CaretRight : CaretLeft;
  const Next = rtl ? CaretLeft : CaretRight;

  const byDay = useMemo(() => {
    const map = new Map<string, typeof transactions>();
    for (const tx of transactions) {
      const key = dayKey(new Date(tx.at));
      map.set(key, [...(map.get(key) ?? []), tx]);
    }
    return map;
  }, [transactions]);

  const dayTxs = useMemo(
    () => [...(byDay.get(selectedDay) ?? [])].sort((a, b) => b.at - a.at),
    [byDay, selectedDay],
  );
  const untitled = useMemo(
    () => transactions.filter((tx) => !tx.title).sort((a, b) => b.at - a.at),
    [transactions],
  );

  const spent = dayTxs.filter((tx) => tx.kind === "expense").reduce((s, tx) => s + tx.amount, 0);
  const received = dayTxs.filter((tx) => tx.kind === "income").reduce((s, tx) => s + tx.amount, 0);

  const lastStripDay = selectedDay >= addDays(today, -3) ? today : addDays(selectedDay, 3);
  const strip = Array.from({ length: 7 }, (_, i) => addDays(lastStripDay, i - 6));

  const relative =
    selectedDay === today ? t.day.today : selectedDay === addDays(today, -1) ? t.day.yesterday : null;

  return (
    <div className="flex flex-col gap-7 px-5 pt-[max(env(safe-area-inset-top),1.5rem)]">
      <header className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-lg font-black tracking-tight text-brand">
          <LogoMark size={28} className="rounded-lg" />
          {t.appName}
        </span>
        <button
          type="button"
          onClick={() => openSheet({ type: "calendar" })}
          aria-label={`${t.day.openCalendar}, ${formatMonth(selectedDay, locale)}`}
          className="-me-2 inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted transition-colors active:bg-sunken"
        >
          <CalendarBlank size={16} weight="bold" aria-hidden />
          {formatMonth(selectedDay, locale)}
          <CaretDown size={12} weight="bold" aria-hidden />
        </button>
      </header>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={t.day.prevDay}
          onClick={() => setSelectedDay(addDays(selectedDay, -1))}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted active:bg-sunken"
        >
          <Prev size={18} aria-hidden />
        </button>
        <ol className="grid flex-1 grid-cols-7 gap-1">
          {strip.map((day) => {
            const active = day === selectedDay;
            const has = byDay.has(day);
            return (
              <li key={day}>
                <button
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  aria-current={active ? "date" : undefined}
                  aria-label={formatDayLong(day, locale)}
                  className={`flex h-16 w-full flex-col items-center justify-center gap-1 rounded-2xl transition-colors ${
                    active ? "bg-brand text-on-brand" : day === today ? "bg-sunken" : "active:bg-sunken"
                  }`}
                >
                  <span className={`text-[11px] font-medium ${active ? "" : "text-muted"}`}>
                    {formatWeekdayShort(day, locale)}
                  </span>
                  <span className="text-base font-bold tabular-nums">{formatDayNumber(day, locale)}</span>
                  <span
                    aria-hidden
                    className={`h-0.5 w-3 rounded-full ${has ? (active ? "bg-on-brand" : "bg-brand") : "bg-transparent"}`}
                  />
                </button>
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          aria-label={t.day.nextDay}
          disabled={selectedDay >= today}
          onClick={() => setSelectedDay(addDays(selectedDay, 1))}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted active:bg-sunken disabled:opacity-30"
        >
          <Next size={18} aria-hidden />
        </button>
      </div>

      <motion.section
        key={selectedDay}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-sm font-medium text-muted">
          {relative ? `${relative}${rtl ? "، " : ", "}` : ""}
          {formatDayLong(selectedDay, locale)}
        </h1>
        <p className="text-sm font-semibold">{t.day.spent}</p>
        <Money value={spent} className="text-4xl font-black tracking-tight" unitClassName="text-base font-semibold text-muted" />
        {(received > 0 || dayTxs.length > 0) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            {received > 0 && (
              <span className="inline-flex items-center gap-1">
                {t.day.income}
                <Money value={received} sign="+" className="font-semibold text-brand-ink" unitClassName="text-xs" />
              </span>
            )}
            <span>{t.day.entries(formatNumber(dayTxs.length, locale))}</span>
          </div>
        )}
      </motion.section>

      {untitled.length > 0 && (
        <button
          type="button"
          onClick={() => openSheet({ type: "tx", id: untitled[0].id })}
          className="flex items-center gap-3 rounded-2xl bg-brand-soft px-4 py-3 text-start text-brand-ink transition-transform active:scale-[0.98]"
        >
          <ChatText size={22} weight="duotone" className="shrink-0" aria-hidden />
          <span className="flex-1 text-sm font-semibold">
            {t.day.needsTitle(formatNumber(untitled.length, locale))}
          </span>
          <span className="rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-on-brand">
            {t.day.needsTitleAction}
          </span>
        </button>
      )}

      {dayTxs.length > 0 ? (
        <ul className="-mt-2 flex flex-col">
          {dayTxs.map((tx, i) => (
            <motion.li
              key={tx.id}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
            >
              <TransactionRow tx={tx} />
            </motion.li>
          ))}
        </ul>
      ) : (
        <section className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-line px-5 py-7">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-sunken text-muted">
            <Tray size={26} weight="duotone" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="font-bold">{t.day.emptyTitle}</h2>
            <p className="text-sm leading-relaxed text-muted">{t.day.emptyBody}</p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2">
            <button type="button" onClick={() => openSheet({ type: "sms" })} className={`${primaryButton} h-11 px-4 text-sm`}>
              <ChatText size={18} aria-hidden />
              {t.add.fromSms}
            </button>
            <button type="button" onClick={() => openSheet({ type: "tx", id: null })} className={`${secondaryButton} h-11 px-4 text-sm`}>
              <NotePencil size={18} aria-hidden />
              {t.add.manual}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
