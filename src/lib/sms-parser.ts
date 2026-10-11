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
  /** True only when the SMS spelled out a calendar date; a bare clock time does not count. */
  dateStated: boolean;
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

// The lookarounds stop the hyphens of a card number (6104-3378-…) from being taken for minus signs.
// Dots group thousands only from two groups up (1.250.000), where they cannot be a decimal point.
const NUMBER = /(?<!\d)([+-]?)\s*(\d{1,3}(?:\.\d{3}){2,}|\d{1,3}(?:[,٬]\d{3})+|\d+)(\.\d+)?\s*([+-]?)(?!\d)/g;
const CURRENCY_AFTER = /^\s*(ریال|تومان|rials?|irr|toman|usd|eur|\$|€)/i;
const CURRENCY_BEFORE = /(ریال|تومان|rials?|irr|toman|usd|eur|\$|€)\s*$/i;
const ACCOUNT_BEFORE = /(حساب|کارت|account|acct|card|a\/c)\s*(شماره|no\.?|number)?\s*[:：#]?\s*$/i;
// The lookarounds keep reference and card numbers such as 123456-07-19 from being read as a date.
const FULL_DATE = /(?<![\d/.\-])(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4})(?!\d)/;
const SHORT_DATE_TIME = /(?<!\d)(\d{2})(\d{2})-(\d{1,2}):(\d{2})(?!\d)/;
const TIME = /(?<!\d)(\d{1,2}):(\d{2})(?::\d{2})?(?!\d)/;
const MINUTE = 60_000;

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

const MONEY_WORDS = [
  ...EXPENSE_WORDS,
  ...INCOME_WORDS,
  ...BALANCE_WORDS,
  ...AMOUNT_WORDS,
  "ریال",
  "تومان",
  "rial",
  "irr",
  "toman",
];

/**
 * Whether the text talks about money at all. The clipboard holds whatever was copied last, so this is
 * what separates an SMS the parser merely struggled with from a shopping list that was never one.
 */
export function looksLikeBankSms(text: string): boolean {
  return has(normalize(text), MONEY_WORDS);
}

function firstIndex(text: string, words: string[]) {
  const lower = text.toLowerCase();
  let best = -1;
  for (const w of words) {
    const i = lower.indexOf(w);
    if (i !== -1 && (best === -1 || i < best)) best = i;
  }
  return best;
}

/** The part of a line before it starts reporting the balance, which says nothing about this payment. */
function beforeBalance(line: string) {
  const cut = firstIndex(line, BALANCE_WORDS);
  return cut === -1 ? line : line.slice(0, cut);
}

type Found = {
  value: number;
  sign: "+" | "-" | "";
  /** Whether it was written in thousands groups, as money nearly always is and card digits never are. */
  grouped: boolean;
  digits: number;
  index: number;
  end: number;
};

function numbersIn(line: string): Found[] {
  const found: Found[] = [];
  for (const match of line.matchAll(NUMBER)) {
    const digits = match[2].replace(/[,٬.]/g, "");
    if (digits.length > 13) continue;
    const sign = (match[1] || match[4]) as Found["sign"];
    found.push({
      value: Number(digits + (match[3] ?? "")),
      sign,
      grouped: digits.length !== match[2].length,
      digits: digits.length,
      index: match.index,
      end: match.index + match[0].length,
    });
  }
  return found;
}

function currentJalaliYear(): number {
  return Number(
    new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", { year: "numeric" })
      .formatToParts(new Date())
      .find((p) => p.type === "year")?.value,
  );
}

/**
 * Turns the three numbers of a written date into Gregorian [year, month, day].
 * Banks write either the year or the day first, and the four-digit part says which; a two-digit year is
 * Jalali, since no Iranian bank writes a Gregorian one. Returns null when the numbers cannot be a date.
 */
function toGregorian(a: number, b: number, c: number): [number, number, number] | null {
  const yearLast = c > 31 || String(c).length === 4;
  const [year, m, d] = yearLast ? [c, b, a] : [a, b, c];
  const y = year < 100 ? year + 1400 : year;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return y >= 1900 ? [y, m, d] : jalaliToGregorian(y, m, d);
}

type ExtractedDate = {
  /** Epoch ms of the moment the SMS describes, or null when it describes none. */
  at: number | null;
  /** Whether a calendar date, rather than only a clock time, was found. */
  stated: boolean;
  /** The text with the date and time taken out, so they cannot be mistaken for amounts. */
  rest: string;
};

function extractDate(text: string): ExtractedDate {
  let rest = text;
  let date: [number, number, number] | null = null;
  let time: [number, number] | null = null;

  const full = rest.match(FULL_DATE);
  if (full) {
    date = toGregorian(Number(full[1]), Number(full[2]), Number(full[3]));
    rest = rest.replace(full[0], " ");
  }

  const short = rest.match(SHORT_DATE_TIME);
  if (short) {
    const [m, d] = [Number(short[1]), Number(short[2])];
    if (!date && m >= 1 && m <= 12 && d >= 1 && d <= 31) date = jalaliToGregorian(currentJalaliYear(), m, d);
    time = [Number(short[3]), Number(short[4])];
    rest = rest.replace(short[0], " ");
  }

  const clock = rest.match(TIME);
  if (clock) {
    time ??= [Number(clock[1]), Number(clock[2])];
    rest = rest.replace(clock[0], " ");
  }

  if (!date && !time) return { at: null, stated: false, rest };

  const now = new Date();
  const result = date ? new Date(date[0], date[1] - 1, date[2], 12) : new Date(now);
  if (time && time[0] < 24 && time[1] < 60) result.setHours(time[0], time[1]);
  result.setSeconds(0, 0);
  // Anything ahead of now was misread. Saying nothing is safer than filing the money in the future.
  if (result.getTime() > now.getTime() + MINUTE) return { at: null, stated: false, rest };
  return { at: result.getTime(), stated: !!date, rest };
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

/** Who the money went to or came from, as the SMS words it, so the saved row is not left untitled. */
const MERCHANT = [
  /(?:خرید از|پرداخت به|واریز از|انتقال به|انتقال از|بابت|از طرف)\s+([^\n\d:،,.]{2,30})/,
  /\bat\s+([A-Z][\w&' ]{1,28}?)(?=[.,]|\s+on\b|\s+for\b|$)/,
];
/** Words that follow a name but belong to the next clause, and words that are never a name at all. */
const TRAILING_WORD = /[\s-]+(به\s*)?(مبلغ|بمبلغ|ریال|تومان|amount|amt|of)\s*$/i;
const NEVER_A_NAME = /^(کارت|حساب|شماره|سپرده|account|card|a\/c)(?![\p{L}\d])/iu;

function suggestTitle(lines: string[], kindWords: string[]): string {
  for (const line of lines) {
    for (const pattern of MERCHANT) {
      const name = line.match(pattern)?.[1].replace(TRAILING_WORD, "").trim();
      if (name && name.length >= 2 && !NEVER_A_NAME.test(name)) return name;
    }
  }
  const label = lines.find((l) => !/\d/.test(l) && l.length <= 30 && has(l, kindWords));
  return label?.trim() ?? "";
}

/** Extracts every useful field from an Iranian or English bank SMS. Returns null if no amount is found. */
export function parseBankSms(raw: string): ParsedSms | null {
  const normalized = normalize(raw);
  // Nothing that never mentions money or a currency is a bank SMS, whatever numbers it happens to hold.
  if (!has(normalized, MONEY_WORDS)) return null;
  const { at, stated, rest } = extractDate(normalized);
  const lines = rest
    .split(/\n|(?<=[.;])\s+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return null;

  let balance: number | null = null;
  let best: { found: Found; score: number } | null = null;
  const amountKeywords = [...EXPENSE_WORDS, ...INCOME_WORDS, ...AMOUNT_WORDS];

  // Every number is judged by the words standing between it and the number before it. Plenty of banks
  // put the amount and the balance on one line, so a whole line can be neither one thing nor the other.
  for (const line of lines) {
    const nums = numbersIn(line).filter((n) => n.value > 0);
    if (!nums.length) continue;

    const ignored = has(line, IGNORE_LINE);
    let lineBalance: number | null = null;
    let reportingBalance = false;
    let cursor = 0;

    for (const n of nums) {
      const label = line.slice(cursor, n.index);
      cursor = n.end;
      if (has(label, BALANCE_WORDS)) reportingBalance = true;
      else if (has(label, amountKeywords)) reportingBalance = false;
      if (ACCOUNT_BEFORE.test(label)) continue;
      if (reportingBalance) {
        lineBalance = n.value;
        continue;
      }

      const currency = CURRENCY_AFTER.test(line.slice(n.end)) || CURRENCY_BEFORE.test(label);
      let score = 0;
      if (has(label, amountKeywords)) score += 4;
      if (currency) score += 6;
      if (n.sign) score += 3;
      if (score === 0 && (ignored || n.digits < 4)) continue;
      score += 1;
      if (!best || score > best.score || (score === best.score && n.value > best.found.value && score === 1)) {
        best = { found: n, score };
      }
    }
    balance ??= lineBalance;
  }

  // Banks word their messages every way imaginable, and some name the amount with nothing beside it that
  // the parser knows. Rather than refuse the whole SMS, the largest number that could be money is taken;
  // the drawer puts the figure in front of the reader for confirmation before anything is saved.
  if (!best) {
    const spare = lines
      .flatMap((line) => {
        const risky = has(line, IGNORE_LINE);
        return numbersIn(line).filter((n) => n.grouped || (!risky && n.digits >= 5 && n.digits <= 12));
      })
      .filter((n) => n.value !== balance)
      .sort((a, b) => b.value - a.value)[0];
    if (spare) best = { found: spare, score: 0 };
  }
  if (!best) return null;

  const body = lines.map(beforeBalance).join("\n");
  const expenseAt = firstIndex(body, EXPENSE_WORDS);
  const incomeAt = firstIndex(body, INCOME_WORDS);
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
    dateStated: stated,
    holder: detectHolder(normalized),
    account: detectAccount(normalized),
    suggestedTitle: suggestTitle(lines, kind === "income" ? INCOME_WORDS : EXPENSE_WORDS),
    category,
  };
}
