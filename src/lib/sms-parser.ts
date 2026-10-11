import { jalaliToGregorian, toLatinDigits } from "./format";
import type { CategoryId, TxKind } from "./types";

export type ParsedSms = {
  kind: TxKind;
  amount: number;
  /** Whether the SMS states amounts in Rials (most Iranian banks do). */
  inRial: boolean;
  bank: string;
  balance: number | null;
  /** Transaction time stated in the SMS, epoch ms. Null when the SMS has no usable date. */
  at: number | null;
  holder: string;
  /** Last digits of the account or card mentioned, if any. */
  account: string;
  suggestedTitle: string;
  category: CategoryId;
};

const EXPENSE_WORDS = [
  "برداشت",
  "خرید",
  "پرداخت",
  "کسر",
  "پرید",
  "کم شد",
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
  "نشست",
  "اضافه شد",
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
const IGNORE_LINE = ["کارت", "card", "پیگیری", "مرجع", "tracking", "ref"];

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

const CATEGORY_HINTS: [CategoryId, RegExp][] = [
  ["bills", /قبض|شارژ|اینترنت|bill|topup|top-up/i],
  ["transport", /اسنپ|تپسی|تاکسی|مترو|بنزین|snapp|tapsi|uber|taxi|fuel/i],
  ["food", /رستوران|کافه|فست ?فود|restaurant|cafe|coffee|starbucks/i],
  ["grocery", /سوپرمارکت|هایپر|افق کوروش|grocery|market/i],
  ["health", /داروخانه|پزشک|بیمارستان|pharmacy|clinic|doctor/i],
  ["salary", /حقوق|salary|payroll/i],
  ["transfer", /انتقال|کارت به کارت|پایا|ساتنا|transfer/i],
  ["shopping", /خرید|فروشگاه|\bpos\b|purchase|\bshop/i],
];

const NUMBER = /([+-]?)\s*(\d{1,3}(?:[,٬]\d{3})+|\d+)(\.\d+)?\s*([+-]?)/g;
const CURRENCY_AFTER = /^\s*(ریال|تومان|rials?|irr|toman|usd|eur|\$|€)/i;
const CURRENCY_BEFORE = /(ریال|تومان|rials?|irr|toman|usd|eur|\$|€)\s*$/i;
const ACCOUNT_BEFORE = /(حساب|کارت|account|acct|card|a\/c)\s*(شماره|no\.?|number)?\s*[:：#]?\s*$/i;
const FULL_DATE = /(\d{2,4})[./-](\d{1,2})[./-](\d{1,2})/;
const SHORT_DATE_TIME = /\b(\d{2})(\d{2})-(\d{1,2}):(\d{2})\b/;
const TIME = /\b(\d{1,2}):(\d{2})\b/;

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

function firstIndex(text: string, words: string[]) {
  const lower = text.toLowerCase();
  let best = -1;
  for (const w of words) {
    const i = lower.indexOf(w);
    if (i !== -1 && (best === -1 || i < best)) best = i;
  }
  return best;
}

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

type Found = { value: number; sign: "+" | "-" | ""; index: number; end: number };

function numbersIn(line: string): Found[] {
  const found: Found[] = [];
  for (const match of line.matchAll(NUMBER)) {
    const digits = match[2].replace(/[,٬]/g, "");
    if (digits.length > 13) continue;
    const sign = (match[1] || match[4]) as Found["sign"];
    found.push({
      value: Number(digits + (match[3] ?? "")),
      sign,
      index: match.index,
      end: match.index + match[0].length,
    });
  }
  return found;
}

function extractDate(text: string): { at: number | null; rest: string } {
  let rest = text;
  let date: [number, number, number] | null = null;
  let time: [number, number] | null = null;

  const full = rest.match(FULL_DATE);
  if (full) {
    const [m, d] = [Number(full[2]), Number(full[3])];
    let y = Number(full[1]);
    if (y < 100) y += 1400;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      date = y >= 1900 ? [y, m, d] : jalaliToGregorian(y, m, d);
    }
    rest = rest.replace(full[0], " ");
  }

  const short = rest.match(SHORT_DATE_TIME);
  if (short) {
    const [m, d] = [Number(short[1]), Number(short[2])];
    if (!date && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const jalaliYear = Number(
        new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", { year: "numeric" })
          .formatToParts(new Date())
          .find((p) => p.type === "year")?.value,
      );
      date = jalaliToGregorian(jalaliYear, m, d);
    }
    time = [Number(short[3]), Number(short[4])];
    rest = rest.replace(short[0], " ");
  }

  const clock = rest.match(TIME);
  if (clock) {
    time ??= [Number(clock[1]), Number(clock[2])];
    rest = rest.replace(clock[0], " ");
  }

  if (!date && !time) return { at: null, rest };
  const now = new Date();
  const result = date ? new Date(date[0], date[1] - 1, date[2], 12) : new Date(now);
  if (time && time[0] < 24 && time[1] < 60) result.setHours(time[0], time[1], 0, 0);
  const at = result.getTime();
  // A date in the future means we misread it; fall back to "now".
  return { at: at > now.getTime() + 60_000 ? null : at, rest };
}

function detectBank(lines: string[], text: string): string {
  for (const line of lines) {
    const fa = line.match(/بانک\s*([^\n:،,.\d]{2,20})/);
    if (fa) return `بانک ${fa[1].trim()}`;
    const en = line.match(/\b([A-Za-z]+(?:\s[A-Za-z]+)?)\s+bank\b|\bbank\s+([A-Za-z]+)/i);
    if (en) return (en[1] ?? en[2]).trim() + " Bank";
  }
  const first = lines[0] ?? "";
  if (first.length <= 24 && !/\d/.test(first) && BANKS.some((b) => first.includes(b))) return first;
  const named = BANKS.find((b) => new RegExp(`(^|\\s)${b}(\\s|$)`).test(text));
  return named ? `بانک ${named}` : "";
}

function detectHolder(text: string): string {
  const fa = text.match(/([\p{L} ]{2,30}?)\s*عزیز/u);
  if (fa) return fa[1].trim();
  const en = text.match(/\bdear\s+([A-Za-z][A-Za-z ]{1,30}?)[,.\n]/i);
  return en ? en[1].trim() : "";
}

function detectAccount(text: string): string {
  const match = text.match(/(?:حساب|کارت|account|acct|card|a\/c)\s*(?:شماره|no\.?|number)?\s*[:：]?\s*([\d*.\-x]{4,})/i);
  if (!match) return "";
  const digits = match[1].replace(/\D/g, "");
  return digits.slice(-4);
}

function suggestTitle(lines: string[], kindWords: string[]): string {
  const merchant = lines.join(" ").match(/\bat\s+([A-Z][\w&' ]{1,28}?)(?=[.,]|\s+on\b|\s+for\b|$)/);
  if (merchant) return merchant[1].trim();
  const label = lines.find((l) => !/\d/.test(l) && l.length <= 30 && has(l, kindWords));
  return label ?? "";
}

/** Extracts every useful field from an Iranian or English bank SMS. Returns null if no amount is found. */
export function parseBankSms(raw: string): ParsedSms | null {
  const normalized = normalize(raw);
  const { at, rest } = extractDate(normalized);
  const lines = rest
    .split(/\n|(?<=[.;])\s+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return null;

  let balance: number | null = null;
  let best: { found: Found; score: number } | null = null;
  const amountKeywords = [...EXPENSE_WORDS, ...INCOME_WORDS, ...AMOUNT_WORDS];

  for (const line of lines) {
    const nums = numbersIn(line).filter((n) => n.value > 0);
    if (!nums.length) continue;

    if (has(line, BALANCE_WORDS)) {
      balance ??= nums[nums.length - 1].value;
      continue;
    }

    const after = keywordEnd(line, amountKeywords);
    const ignored = has(line, IGNORE_LINE);
    for (const n of nums) {
      if (ACCOUNT_BEFORE.test(line.slice(Math.max(0, n.index - 24), n.index))) continue;
      const currency = CURRENCY_AFTER.test(line.slice(n.end)) || CURRENCY_BEFORE.test(line.slice(0, n.index));
      let score = 0;
      if (after !== -1 && n.index >= after) score += 4;
      if (currency) score += 6;
      if (n.sign) score += 3;
      if (score === 0 && (ignored || String(Math.trunc(n.value)).length < 4)) continue;
      score += 1;
      if (!best || score > best.score || (score === best.score && n.value > best.found.value && score === 1)) {
        best = { found: n, score };
      }
    }
  }
  if (!best) return null;

  const bodyWithoutBalance = lines.filter((l) => !has(l, BALANCE_WORDS)).join("\n");
  const expenseAt = firstIndex(bodyWithoutBalance, EXPENSE_WORDS);
  const incomeAt = firstIndex(bodyWithoutBalance, INCOME_WORDS);
  let kind: TxKind;
  if (best.found.sign) kind = best.found.sign === "+" ? "income" : "expense";
  else if (expenseAt !== -1 && (incomeAt === -1 || expenseAt < incomeAt)) kind = "expense";
  else if (incomeAt !== -1) kind = "income";
  else kind = "expense";

  const hinted = CATEGORY_HINTS.find(([, pattern]) => pattern.test(normalized))?.[0];
  const category: CategoryId = hinted ?? (kind === "income" ? "transfer" : "other");

  return {
    kind,
    amount: best.found.value,
    inRial: /ریال|rial|irr/i.test(normalized) || !/تومان|toman|\$|usd|eur|€/i.test(normalized),
    bank: detectBank(lines, normalized),
    balance,
    at,
    holder: detectHolder(normalized),
    account: detectAccount(normalized),
    suggestedTitle: suggestTitle(lines, kind === "income" ? INCOME_WORDS : EXPENSE_WORDS),
    category,
  };
}
