import { jalaliToGregorian } from "./format";
import type { Locale } from "./types";

/** Day keys are local Gregorian `YYYY-MM-DD` strings, independent of display calendar. */
export type DayKey = string;

type Calendar = "persian" | "gregory";

const calendarOf = (locale: Locale): Calendar => (locale === "fa" ? "persian" : "gregory");

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = locale + JSON.stringify(options);
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, f);
  }
  return f;
}

const displayLocale = (locale: Locale) => (locale === "fa" ? "fa-IR-u-ca-persian" : "en-US");

export function dayKey(date: Date): DayKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromDayKey(key: DayKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

export const todayKey = () => dayKey(new Date());

export function addDays(key: DayKey, amount: number): DayKey {
  const date = fromDayKey(key);
  date.setDate(date.getDate() + amount);
  return dayKey(date);
}

function monthId(key: DayKey, locale: Locale): string {
  const parts = formatter(`en-US-u-ca-${calendarOf(locale)}-nu-latn`, {
    year: "numeric",
    month: "numeric",
  }).formatToParts(fromDayKey(key));
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  return `${year}-${month}`;
}

export function sameMonth(a: DayKey, b: DayKey, locale: Locale) {
  return monthId(a, locale) === monthId(b, locale);
}

/** All day keys of the calendar month (Persian for fa, Gregorian for en) containing `key`. */
export function monthDays(key: DayKey, locale: Locale): DayKey[] {
  const id = monthId(key, locale);
  let start = key;
  while (monthId(addDays(start, -1), locale) === id) start = addDays(start, -1);
  const days: DayKey[] = [];
  for (let d = start; monthId(d, locale) === id; d = addDays(d, 1)) days.push(d);
  return days;
}

export function shiftMonth(key: DayKey, locale: Locale, direction: 1 | -1): DayKey {
  const days = monthDays(key, locale);
  const edge = direction === 1 ? addDays(days[days.length - 1], 1) : addDays(days[0], -1);
  return monthDays(edge, locale)[0];
}

/** Year and 1-based month of `key` in the locale's calendar. */
export function monthParts(key: DayKey, locale: Locale): { year: number; month: number } {
  const [year, month] = monthId(key, locale).split("-").map(Number);
  return { year, month };
}

/** First day of a month given in the locale's calendar. */
export function monthStart(year: number, month: number, locale: Locale): DayKey {
  if (locale === "fa") {
    const [gy, gm, gd] = jalaliToGregorian(year, month, 1);
    return dayKey(new Date(gy, gm - 1, gd, 12));
  }
  return dayKey(new Date(year, month - 1, 1, 12));
}

/** Column of `key` in a week that starts on Saturday (fa) or Sunday (en). */
export function weekdayIndex(key: DayKey, locale: Locale) {
  const day = fromDayKey(key).getDay();
  return locale === "fa" ? (day + 1) % 7 : day;
}

export function formatMonthName(key: DayKey, locale: Locale) {
  return formatter(displayLocale(locale), { month: "long" }).format(fromDayKey(key));
}

export function formatYear(key: DayKey, locale: Locale) {
  return formatter(displayLocale(locale), { year: "numeric" }).format(fromDayKey(key));
}

export function formatMonth(key: DayKey, locale: Locale) {
  return formatter(displayLocale(locale), { month: "long", year: "numeric" }).format(
    fromDayKey(key),
  );
}

export function formatDayLong(key: DayKey, locale: Locale) {
  return formatter(displayLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(fromDayKey(key));
}

export function formatWeekdayShort(key: DayKey, locale: Locale) {
  return formatter(displayLocale(locale), { weekday: locale === "fa" ? "narrow" : "short" }).format(
    fromDayKey(key),
  );
}

export function formatDayNumber(key: DayKey, locale: Locale) {
  return formatter(displayLocale(locale), { day: "numeric" }).format(fromDayKey(key));
}

export function formatTime(at: number, locale: Locale) {
  return formatter(locale === "fa" ? "fa-IR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(at));
}
