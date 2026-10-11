import { toLatinDigits } from "./format";
import type { TxKind } from "./types";

export type ParsedSms = {
  kind: TxKind;
  amount: number;
  /** Whether the SMS states the amount in Rials (most Iranian banks do). */
  inRial: boolean;
  bank: string;
  balance: number | null;
};

const EXPENSE_WORDS = [
  "برداشت",
  "خرید",
  "پرداخت",
  "کسر",
  "انتقال از",
  "debit",
  "debited",
  "withdraw",
  "withdrawal",
  "purchase",
  "paid",
  "spent",
  "payment",
];
const INCOME_WORDS = [
  "واریز",
  "دریافت",
  "انتقال به حساب",
  "سود",
  "credit",
  "credited",
  "deposit",
  "deposited",
  "received",
  "refund",
];
const BALANCE_WORDS = ["مانده", "موجودی", "balance", "avl"];
const AMOUNT_WORDS = ["مبلغ", "amount", "amt"];
const IGNORE_LINE = ["حساب", "کارت", "account", "card", "پیگیری", "مرجع", "tracking"];

const BANKS = [
  "ملت",
  "ملی",
  "صادرات",
  "تجارت",
  "سپه",
  "پاسارگاد",
  "سامان",
  "پارسیان",
  "رسالت",
  "آینده",
  "شهر",
  "مسکن",
  "کشاورزی",
  "رفاه",
  "اقتصاد نوین",
  "سینا",
  "کارآفرین",
  "خاورمیانه",
  "توسعه تعاون",
  "مهر ایران",
  "قرض الحسنه",
  "بلو",
  "ویپاد",
];

const NUMBER = /([+-]?)\s*(\d{1,3}(?:[,٬]\d{3})+|\d+)(\.\d+)?\s*([+-]?)/g;

function normalize(text: string): string {
  return toLatinDigits(text)
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\r/g, "");
}

const has = (line: string, words: string[]) => {
  const lower = line.toLowerCase();
  return words.some((w) => lower.includes(w));
};

/** Index right after the first keyword found in the line, or -1. */
function keywordEnd(line: string, words: string[]) {
  const lower = line.toLowerCase();
  let best = -1;
  for (const w of words) {
    const i = lower.indexOf(w);
    if (i !== -1 && (best === -1 || i < best)) best = i + w.length;
  }
  return best;
}

const looksLikeDateOrTime = (line: string) =>
  /\d{2,4}\/\d{1,2}\/\d{1,2}/.test(line) || /\b\d{1,2}:\d{2}\b/.test(line);

type Found = { value: number; sign: "+" | "-" | ""; index: number };

function numbersIn(line: string): Found[] {
  const found: Found[] = [];
  for (const match of line.matchAll(NUMBER)) {
    const digits = match[2].replace(/[,٬]/g, "");
    if (digits.length > 13) continue;
    const sign = (match[1] || match[4]) as Found["sign"];
    found.push({ value: Number(digits + (match[3] ?? "")), sign, index: match.index });
  }
  return found;
}

const largest = (nums: Found[]) => nums.reduce((a, b) => (b.value > a.value ? b : a));

function detectBank(lines: string[]): string {
  for (const line of lines) {
    const fa = line.match(/بانک\s*([^\n:،,.\d]{2,20})/);
    if (fa) return `بانک ${fa[1].trim()}`;
    const en = line.match(/\b([A-Za-z]+(?:\s[A-Za-z]+)?)\s+bank\b|\bbank\s+([A-Za-z]+)/i);
    if (en) return (en[1] ?? en[2]).trim() + " Bank";
  }
  for (const name of BANKS) {
    if (lines[0]?.includes(name)) return `بانک ${name}`;
  }
  return "";
}

/** Extracts amount and direction from an Iranian or English bank SMS. Returns null if no amount is found. */
export function parseBankSms(raw: string): ParsedSms | null {
  const text = normalize(raw);
  const lines = text
    .split(/\n|(?<=[.;])\s+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return null;

  let kind: TxKind | null = null;
  let amount: number | null = null;
  let balance: number | null = null;
  let fallback: Found | null = null;

  for (const line of lines) {
    const nums = numbersIn(line).filter((n) => n.value > 0);
    if (!nums.length) continue;

    if (has(line, BALANCE_WORDS)) {
      balance ??= nums[nums.length - 1].value;
      continue;
    }

    const expense = has(line, EXPENSE_WORDS);
    const income = has(line, INCOME_WORDS);
    const labelled = expense || income || has(line, AMOUNT_WORDS);

    if (labelled && amount === null) {
      const after = keywordEnd(line, [...EXPENSE_WORDS, ...INCOME_WORDS, ...AMOUNT_WORDS]);
      const best = nums.find((n) => n.index >= after) ?? largest(nums);
      amount = best.value;
      if (expense && !income) kind = "expense";
      else if (income && !expense) kind = "income";
      else if (best.sign) kind = best.sign === "+" ? "income" : "expense";
      continue;
    }

    if (has(line, IGNORE_LINE) || looksLikeDateOrTime(line)) continue;
    const signed = nums.find((n) => n.sign);
    const candidate = signed ?? largest(nums);
    if (!fallback || (signed && !fallback.sign)) fallback = candidate;
  }

  if (amount === null && fallback) {
    amount = fallback.value;
    if (fallback.sign) kind = fallback.sign === "+" ? "income" : "expense";
  }
  if (amount === null) return null;

  if (!kind) {
    if (has(text, INCOME_WORDS)) kind = "income";
    else kind = "expense";
  }

  const inRial = /ریال|rial|irr/i.test(text) || !/تومان|toman|\$|usd|eur|€/i.test(text);

  return { kind, amount, inRial, bank: detectBank(lines), balance };
}
