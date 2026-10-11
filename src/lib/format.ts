import type { Locale } from "./types";

export function toLatinDigits(text: string): string {
  return text
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
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
