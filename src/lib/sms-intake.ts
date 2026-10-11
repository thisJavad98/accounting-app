import { dayKey, todayKey } from "./dates";
import { newId } from "./format";
import { parseBankSms } from "./sms-parser";
import type { Currency, Transaction } from "./types";

const MINUTE = 60_000;

/**
 * What came of handing a piece of text to the SMS reader.
 *
 * `old` exists because the clipboard holds on to an SMS for days, so the app has to tell a message that
 * just arrived from one left over from last week. `duplicate` exists because the Shortcut hands the same
 * message over twice, once in the link and once through the clipboard.
 */
export type Intake =
  | { status: "unreadable" }
  | { status: "old" }
  | { status: "duplicate"; tx: Transaction }
  | { status: "ready"; tx: Transaction };

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

export function intakeSms(raw: string, currency: Currency, transactions: Transaction[]): Intake {
  const parsed = parseBankSms(raw);
  if (!parsed) return { status: "unreadable" };

  const toCurrency = (value: number) => (currency === "IRT" && parsed.inRial ? Math.round(value / 10) : value);
  const tx: Transaction = {
    id: newId(),
    kind: parsed.kind,
    amount: toCurrency(parsed.amount),
    at: parsed.at ?? toMinute(Date.now()),
    title: parsed.suggestedTitle || parsed.bank,
    note: "",
    category: parsed.category,
    bank: parsed.bank,
    balance: parsed.balance === null ? null : toCurrency(parsed.balance),
  };

  // Only a date the bank spelled out can age an SMS. One carrying just a clock time, or no time at all,
  // is taken as having arrived now, because guessing it is old would throw away a real transaction.
  if (parsed.dateStated && dayKey(new Date(tx.at)) !== todayKey()) return { status: "old" };

  const same = findSame(transactions, tx);
  return same ? { status: "duplicate", tx: same } : { status: "ready", tx };
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
