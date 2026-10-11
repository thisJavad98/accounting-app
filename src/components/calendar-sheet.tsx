"use client";

import { CaretDown, CaretLeft, CaretRight, CalendarCheck } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import {
  addDays,
  dayKey,
  formatDayLong,
  formatDayNumber,
  formatMonth,
  formatMonthName,
  formatWeekdayShort,
  formatYear,
  monthDays,
  monthParts,
  monthStart,
  sameMonth,
  shiftMonth,
  todayKey,
  weekdayIndex,
  type DayKey,
} from "@/lib/dates";
import { Sheet } from "./sheet";
import { useStore } from "./store";
import { secondaryButton } from "./ui";

const EASE = [0.16, 1, 0.3, 1] as const;
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

const navButton =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors active:bg-sunken disabled:opacity-30";

export function CalendarSheet() {
  const { t, settings, transactions, selectedDay, setSelectedDay, closeSheet } = useStore();
  const reduce = useReducedMotion();
  const locale = settings.locale;
  const rtl = locale === "fa";
  const Prev = rtl ? CaretRight : CaretLeft;
  const Next = rtl ? CaretLeft : CaretRight;
  const today = todayKey();
  const thisYear = monthParts(today, locale).year;

  const [view, setView] = useState<DayKey>(() => monthDays(selectedDay, locale)[0]);
  const [mode, setMode] = useState<"days" | "months">("days");
  const [year, setYear] = useState(() => monthParts(selectedDay, locale).year);
  const [direction, setDirection] = useState<1 | -1>(1);

  const activeDays = useMemo(() => new Set(transactions.map((tx) => dayKey(new Date(tx.at)))), [transactions]);

  const days = monthDays(view, locale);
  const lead = weekdayIndex(days[0], locale);
  const weekdays = Array.from({ length: 7 }, (_, i) => formatWeekdayShort(addDays(days[0], i - lead), locale));
  const nextView = shiftMonth(view, locale, 1);
  const viewParts = monthParts(view, locale);

  function go(step: 1 | -1) {
    setDirection(step);
    if (mode === "days") setView(shiftMonth(view, locale, step));
    else setYear(year + step);
  }

  function pick(day: DayKey) {
    setSelectedDay(day);
    closeSheet();
  }

  function openMonths() {
    setYear(viewParts.year);
    setDirection(1);
    setMode(mode === "days" ? "months" : "days");
  }

  const slide = (dir: 1 | -1) => (reduce ? 0 : dir * (rtl ? -1 : 1) * 36);

  return (
    <Sheet title={t.day.calendar} onClose={closeSheet}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={mode === "days" ? t.day.prevMonth : t.day.prevYear}
            className={navButton}
          >
            <Prev size={18} weight="bold" aria-hidden />
          </button>
          <button
            type="button"
            onClick={openMonths}
            aria-expanded={mode === "months"}
            aria-label={t.day.pickMonth}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-base font-bold transition-colors active:bg-sunken"
          >
            <span className="tabular-nums">
              {mode === "days" ? formatMonth(view, locale) : formatYear(monthStart(year, 1, locale), locale)}
            </span>
            <CaretDown
              size={14}
              weight="bold"
              aria-hidden
              className={`text-muted transition-transform duration-300 ${mode === "months" ? "rotate-180" : ""}`}
            />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={mode === "days" ? nextView > today : year >= thisYear}
            aria-label={mode === "days" ? t.day.nextMonth : t.day.nextYear}
            className={navButton}
          >
            <Next size={18} weight="bold" aria-hidden />
          </button>
        </div>

        <div className="relative min-h-[19rem] overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            {mode === "days" ? (
              <motion.div
                key={`d-${view}`}
                custom={direction}
                variants={{
                  enter: (dir: 1 | -1) => ({ opacity: 0, x: slide(dir) }),
                  center: { opacity: 1, x: 0 },
                  exit: (dir: 1 | -1) => ({ opacity: 0, x: slide(-dir as 1 | -1) }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.32, ease: EASE }}
                className="flex flex-col gap-1"
              >
                <div className="grid grid-cols-7 text-center text-xs font-medium text-muted" aria-hidden>
                  {weekdays.map((name, i) => (
                    <span key={i} className="py-1.5">
                      {name}
                    </span>
                  ))}
                </div>
                <ol className="grid grid-cols-7 gap-1">
                  {Array.from({ length: lead }, (_, i) => (
                    <li key={`lead-${i}`} aria-hidden />
                  ))}
                  {days.map((day) => {
                    const active = day === selectedDay;
                    const isToday = day === today;
                    const has = activeDays.has(day);
                    return (
                      <li key={day}>
                        <button
                          type="button"
                          disabled={day > today}
                          onClick={() => pick(day)}
                          aria-current={active ? "date" : undefined}
                          aria-label={formatDayLong(day, locale)}
                          className={`flex h-11 w-full flex-col items-center justify-center gap-0.5 rounded-xl text-sm font-semibold tabular-nums transition-colors disabled:opacity-25 ${
                            active
                              ? "bg-brand text-on-brand"
                              : isToday
                                ? "ring-2 ring-brand ring-inset text-brand-ink"
                                : "active:bg-sunken"
                          }`}
                        >
                          {formatDayNumber(day, locale)}
                          <span
                            aria-hidden
                            className={`size-1 rounded-full ${has ? (active ? "bg-on-brand" : "bg-brand") : "bg-transparent"}`}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </motion.div>
            ) : (
              <motion.ol
                key={`m-${year}`}
                custom={direction}
                variants={{
                  enter: (dir: 1 | -1) => ({ opacity: 0, x: slide(dir), scale: reduce ? 1 : 0.98 }),
                  center: { opacity: 1, x: 0, scale: 1 },
                  exit: (dir: 1 | -1) => ({ opacity: 0, x: slide(-dir as 1 | -1) }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.32, ease: EASE }}
                className="grid grid-cols-3 gap-2"
              >
                {MONTHS.map((month) => {
                  const start = monthStart(year, month, locale);
                  const active = viewParts.year === year && viewParts.month === month;
                  const current = sameMonth(start, today, locale);
                  return (
                    <li key={month}>
                      <button
                        type="button"
                        disabled={start > today}
                        onClick={() => {
                          setDirection(start < view ? -1 : 1);
                          setView(start);
                          setMode("days");
                        }}
                        aria-current={active ? "date" : undefined}
                        className={`flex h-14 w-full items-center justify-center rounded-2xl text-sm font-semibold transition-colors disabled:opacity-25 ${
                          active
                            ? "bg-brand text-on-brand"
                            : current
                              ? "bg-brand-soft text-brand-ink"
                              : "bg-sunken active:bg-line"
                        }`}
                      >
                        {formatMonthName(start, locale)}
                      </button>
                    </li>
                  );
                })}
              </motion.ol>
            )}
          </AnimatePresence>
        </div>

        <button type="button" onClick={() => pick(today)} className={`${secondaryButton} h-12 text-sm`}>
          <CalendarCheck size={18} aria-hidden />
          {t.day.goToday}
        </button>
      </div>
    </Sheet>
  );
}
