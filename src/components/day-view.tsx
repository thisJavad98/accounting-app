"use client";

import { CalendarBlank, CaretDown, CaretLeft, CaretRight, ChatText, NotePencil, PiggyBank, Tray } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "motion/react";
import { useMemo, useState } from "react";
import {
  addDays,
  dayKey,
  formatDayLong,
  formatDayNumber,
  formatMonth,
  formatMonthName,
  formatWeekdayShort,
  monthDays,
  shiftMonth,
  todayKey,
} from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { BankInventoryCard } from "./bank-inventory-card";
import { Money } from "./money";
import { useStore } from "./store";
import { TransactionRow } from "./transaction-row";
import { primaryButton, secondaryButton } from "./ui";
import { LogoMark } from "./logo";
import { useRouter } from "next/navigation";

/** A drag is a day change once it passes either of these. */
const SWIPE_DISTANCE = 56;
const SWIPE_VELOCITY = 400;

type Slide = { direction: number; distance: number };

const slide = {
  enter: ({ direction, distance }: Slide) => ({ x: `${direction * distance}%`, opacity: 0 }),
  center: { x: "0%", opacity: 1 },
  exit: ({ direction, distance }: Slide) => ({ x: `${-direction * distance}%`, opacity: 0 }),
};

export function DayView() {
  const { t, settings, transactions, selectedDay, setSelectedDay, openSheet } = useStore();
  const reduce = useReducedMotion();
  const locale = settings.locale;
  const { push } =useRouter();
  const today = todayKey();
  const rtl = locale === "fa";
  const Prev = rtl ? CaretRight : CaretLeft;
  const Next = rtl ? CaretLeft : CaretRight;
  /** Screen direction a later day travels in: rightwards in LTR, leftwards in RTL. */
  const forward = rtl ? -1 : 1;

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

  const monthReviewTarget = useMemo(() => {
    const currentDays = monthDays(today, locale);
    const todayIndex = currentDays.indexOf(today);
    const isNearEndOfMonth = todayIndex >= currentDays.length - 3;
    const currentSet = new Set(currentDays);
    const currentHasExpenses = transactions.some(
      (tx) => tx.kind === "expense" && currentSet.has(dayKey(new Date(tx.at))),
    );
    if (isNearEndOfMonth && currentHasExpenses) {
      return { day: today, text: t.day.monthEndPrompt };
    }
    const prevStart = shiftMonth(today, locale, -1);
    const prevSet = new Set(monthDays(prevStart, locale));
    const prevHasExpenses = transactions.some(
      (tx) => tx.kind === "expense" && prevSet.has(dayKey(new Date(tx.at))),
    );
    if (prevHasExpenses) {
      return { day: prevStart, text: t.day.monthReviewPrompt(formatMonthName(prevStart, locale)) };
    }
    return null;
  }, [today, locale, transactions, t.day]);

  const spent = dayTxs.filter((tx) => tx.kind === "expense").reduce((s, tx) => s + tx.amount, 0);
  const received = dayTxs.filter((tx) => tx.kind === "income").reduce((s, tx) => s + tx.amount, 0);

  const lastStripDay = selectedDay >= addDays(today, -3) ? today : addDays(selectedDay, 3);
  const strip = Array.from({ length: 7 }, (_, i) => addDays(lastStripDay, i - 6));

  const relative =
    selectedDay === today ? t.day.today : selectedDay === addDays(today, -1) ? t.day.yesterday : null;

  // The panel slides in from whichever side the new day sits on, no matter what changed the day.
  const [shown, setShown] = useState({ day: selectedDay, direction: forward });
  if (shown.day !== selectedDay) {
    setShown({ day: selectedDay, direction: selectedDay > shown.day ? forward : -forward });
  }
  const custom: Slide = { direction: shown.direction, distance: reduce ? 0 : 100 };

  function goDay(step: 1 | -1) {
    if (step === 1 && selectedDay >= today) return;
    setSelectedDay(addDays(selectedDay, step));
  }

  function onSwipe(_: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: PanInfo) {
    if (Math.abs(offset.x) < SWIPE_DISTANCE && Math.abs(velocity.x) < SWIPE_VELOCITY) return;
    // Dragging the panel against `forward` pulls the later day in from that side.
    const toward = Math.sign(Math.abs(offset.x) > 8 ? offset.x : velocity.x);
    goDay(toward === forward ? -1 : 1);
  }

  return (
    <div className="flex flex-col gap-7 px-5 pt-[max(env(safe-area-inset-top),1.5rem)]">
      <header className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-lg font-black tracking-tight text-brand cursor-pointer" onClick={() => push("/")}>
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
          onClick={() => goDay(-1)}
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
          onClick={() => goDay(1)}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted active:bg-sunken disabled:opacity-30"
        >
          <Next size={18} aria-hidden />
        </button>
      </div>

      <div className="relative -mx-5 overflow-x-clip px-5">
        <AnimatePresence initial={false} mode="popLayout" custom={custom}>
          <motion.div
            key={selectedDay}
            custom={custom}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 420, damping: 44 },
              opacity: { duration: 0.2 },
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.22}
            dragMomentum={false}
            onDragEnd={onSwipe}
            className="flex flex-col gap-7"
          >
            <section className="flex flex-col gap-2">
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
            </section>

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

            {monthReviewTarget && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDay(monthReviewTarget.day);
                  push(`/app/reports/${monthDays(monthReviewTarget.day, locale)[0]}`);
                }}
                className="flex items-center gap-3 rounded-2xl bg-sunken px-4 py-3.5 text-start transition-transform active:scale-[0.98]"
              >
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
                  <PiggyBank size={22} weight="duotone" aria-hidden />
                </span>
                <span className="flex-1 text-sm font-semibold leading-snug">
                  {monthReviewTarget.text}
                </span>
                <span className="shrink-0 rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-on-brand">
                  {t.day.monthReviewAction}
                </span>
              </button>
            )}

            <BankInventoryCard />

            {dayTxs.length > 0 ? (
              <ul className="-mt-2 flex flex-col">
                {dayTxs.map((tx) => (
                  <li key={tx.id}>
                    <TransactionRow tx={tx} />
                  </li>
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
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
