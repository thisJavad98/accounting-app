import type { Locale } from "./types";

export function toLatinDigits(text: string): string {
  return text
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/** Converts a Jalali (Persian) date to Gregorian [year, month, day]. */
export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  jy += 1595;
  let days =
    -355668 +
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    days--;
    gy += 100 * Math.floor(days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 12 && gd > monthDays[gm]) gd -= monthDays[gm++];
  return [gy, gm + 1, gd];
}

export function toPersianDigits(text: string): string {
  return text.replace(/\d/g, (d) => String.fromCharCode(0x06f0 + Number(d)));
}

/** Live-formats an amount field: keeps one decimal point and groups thousands. */
export function formatAmountInput(text: string, locale: Locale): string {
  const latin = toLatinDigits(text).replace(/٫/g, ".").replace(/[^\d.]/g, "");
  const [whole, ...rest] = latin.split(".");
  const grouped = whole.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const out = rest.length ? `${grouped}.${rest.join("").slice(0, 2)}` : grouped;
  return locale === "fa" ? toPersianDigits(out) : out;
}

const numberFormats = new Map<Locale, Intl.NumberFormat>();

export function formatNumber(value: number, locale: Locale): string {
  let f = numberFormats.get(locale);
  if (!f) {
    f = new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US", {
      maximumFractionDigits: 2,
    });
    numberFormats.set(locale, f);
  }
  return f.format(value);
}

/** Parses user-typed amounts in Latin, Persian or Arabic digits, with any grouping separators. */
export function parseAmount(text: string): number {
  const clean = toLatinDigits(text).replace(/[٫]/g, ".").replace(/[^\d.]/g, "");
  const value = Number.parseFloat(clean);
  return Number.isFinite(value) ? value : 0;
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
