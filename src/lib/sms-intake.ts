import { dayKey, todayKey } from "./dates";
import { newId } from "./format";
import { parseBankSms, parseBankSmsBatch, type ParsedSms } from "./sms-parser";
import type { Currency, Transaction } from "./types";

const MINUTE = 60_000;

/**
 * What came of handing a piece of text to the SMS reader.
 *
 * `old` exists because the clipboard holds on to an SMS for days, so the app has to tell a message that
 * just arrived from one left over from last week. It still carries its transaction: an old SMS is worth
 * keeping, it just belongs on the day the bank dated it. `duplicate` exists because the Shortcut hands
 * the same message over twice, once in the link and once through the clipboard.
 */
export type Intake =
  | { status: "unreadable" }
  | { status: "old"; tx: Transaction; extra?: Transaction[] }
  | { status: "duplicate"; tx: Transaction }
  | { status: "ready"; tx: Transaction; extra?: Transaction[] };

/** Bank SMS never mention seconds, so times are kept to the minute and two reads of one SMS match. */
const toMinute = (at: number) => Math.floor(at / MINUTE) * MINUTE;

/**
 * The same SMS read twice parses identically, so it is matched on every field. Two different payments
 * can share an amount and a minute, and the balance left over is what tells them apart.
 */
function findSame(transactions: Transaction[], tx: Transaction) {
  return transactions.find(
    (item) =>
      toMinute(item.at) === tx.at &&
      item.amount === tx.amount &&
      item.kind === tx.kind &&
      item.bank === tx.bank &&
      item.balance === tx.balance,
  );
}

function toTransaction(parsed: ParsedSms, currency: Currency, indexOffset = 0): Transaction {
  const toCurrency = (value: number) => (currency === "IRT" && parsed.inRial ? Math.round(value / 10) : value);
  return {
    id: newId(),
    kind: parsed.kind,
    amount: toCurrency(parsed.amount),
    at: parsed.at ?? toMinute(Date.now()) + indexOffset,
    title: parsed.suggestedTitle || parsed.bank,
    note: "",
    category: parsed.category,
    bank: parsed.bank,
    balance: parsed.balance === null ? null : toCurrency(parsed.balance),
  };
}

export function intakeSms(raw: string, currency: Currency, transactions: Transaction[]): Intake {
  const batch = parseBankSmsBatch(raw);
  if (batch.length > 1) {
    const fresh: { tx: Transaction; dateStated: boolean }[] = [];
    let firstDupe: Transaction | null = null;
    batch.forEach((item, idx) => {
      const tx = toTransaction(item.parsed, currency, idx);
      const same = findSame([...transactions, ...fresh.map((f) => f.tx)], tx);
      if (same) {
        firstDupe ??= same;
      } else {
        fresh.push({ tx, dateStated: item.parsed.dateStated });
      }
    });
    if (fresh.length === 0) {
      return firstDupe ? { status: "duplicate", tx: firstDupe } : { status: "unreadable" };
    }
    const [first, ...rest] = fresh;
    const old = first.dateStated && dayKey(new Date(first.tx.at)) !== todayKey();
    const extra = rest.length > 0 ? rest.map((r) => r.tx) : undefined;
    return extra
      ? { status: old ? "old" : "ready", tx: first.tx, extra }
      : { status: old ? "old" : "ready", tx: first.tx };
  }

  const parsed = batch[0]?.parsed ?? parseBankSms(raw);
  if (!parsed) return { status: "unreadable" };

  const tx = toTransaction(parsed, currency);
  const same = findSame(transactions, tx);
  if (same) return { status: "duplicate", tx: same };

  // Only a date the bank spelled out can age an SMS. One carrying just a clock time, or no time at all,
  // is taken as having arrived now, because guessing it is old would throw away a real transaction.
  const old = parsed.dateStated && dayKey(new Date(tx.at)) !== todayKey();
  return { status: old ? "old" : "ready", tx };
}

/**
 * Whether the SMS has to come in through the clipboard. iOS is the one platform that drops the query
 * string when a Shortcut opens an installed web app, so there the link cannot carry the message.
 */
export function needsClipboardHandover(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    ("standalone" in navigator ? navigator.standalone === true : matchMedia("(display-mode: standalone)").matches)
  );
}

/** Reads a bank SMS handed over by the Android share sheet (`?text=`) or an iOS Shortcut (`?sms=` or `#sms=`). */
export function readIncomingSms(): string | null {
  const query = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.slice(1));
  return query.get("sms") || query.get("text") || hash.get("sms") || null;
}

export function stripIncomingSms() {
  const url = new URL(location.href);
  for (const key of ["sms", "text", "title"]) url.searchParams.delete(key);
  if (new URLSearchParams(url.hash.slice(1)).has("sms")) url.hash = "";
  history.replaceState(history.state, "", url.pathname + url.search + url.hash);
}
