import type { CategoryId, Currency, Locale, Settings, Transaction } from "./types";
import { CATEGORY_IDS } from "./categories";

/**
 * Browsers cap a single cookie at ~4KB, so transactions are serialized as
 * compact tuples, base64-encoded and split across numbered cookies.
 * Every cookie is sent with every request, so the total is capped well below
 * the request-header limits of common servers (see `dev`/`start` scripts).
 */
const CHUNK_SIZE = 3800;
const MAX_CHUNKS = 24;
const TX_PREFIX = "dk_t";
const TX_COUNT = "dk_tn";
const LANG = "dk_lang";
const CURRENCY = "dk_cur";
const MAX_AGE = 60 * 60 * 24 * 400;

export const STORAGE_CAPACITY = CHUNK_SIZE * MAX_CHUNKS;

type TxTuple = [string, 0 | 1, number, number, string, string, string, string];

function readCookies(): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of document.cookie.split("; ")) {
    if (!part) continue;
    const eq = part.indexOf("=");
    map.set(part.slice(0, eq), part.slice(eq + 1));
  }
  return map;
}

function writeCookie(name: string, value: string, maxAge = MAX_AGE) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function encode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function decode(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function toTuple(tx: Transaction): TxTuple {
  return [
    tx.id,
    tx.kind === "income" ? 1 : 0,
    tx.amount,
    Math.round(tx.at / 1000),
    tx.title,
    tx.note,
    tx.category,
    tx.bank,
  ];
}

function fromTuple(raw: unknown): Transaction | null {
  if (!Array.isArray(raw) || raw.length < 8) return null;
  const [id, kind, amount, at, title, note, category, bank] = raw;
  if (typeof id !== "string" || typeof amount !== "number" || typeof at !== "number") {
    return null;
  }
  return {
    id,
    kind: kind === 1 ? "income" : "expense",
    amount,
    at: at * 1000,
    title: String(title ?? ""),
    note: String(note ?? ""),
    category: CATEGORY_IDS.includes(category as CategoryId)
      ? (category as CategoryId)
      : "other",
    bank: String(bank ?? ""),
  };
}

function serializeTransactions(txs: Transaction[]): string {
  return encode(JSON.stringify(txs.map(toTuple)));
}

export function exportJson(txs: Transaction[]): string {
  return JSON.stringify({ app: "dakhl", version: 1, transactions: txs }, null, 2);
}

export function parseBackup(json: string): Transaction[] {
  const data: unknown = JSON.parse(json);
  const list =
    data && typeof data === "object" && "transactions" in data
      ? (data as { transactions: unknown }).transactions
      : data;
  if (!Array.isArray(list)) throw new Error("invalid backup");
  return list
    .map((item) =>
      fromTuple(
        Array.isArray(item) ? item : item && typeof item === "object" ? looseTuple(item) : null,
      ),
    )
    .filter((tx): tx is Transaction => tx !== null);
}

function looseTuple(obj: Record<string, unknown>): unknown[] {
  return [
    obj.id,
    obj.kind === "income" ? 1 : 0,
    obj.amount,
    typeof obj.at === "number" ? Math.round(obj.at / 1000) : obj.at,
    obj.title,
    obj.note,
    obj.category,
    obj.bank,
  ];
}

export function loadTransactions(): Transaction[] {
  try {
    const cookies = readCookies();
    const count = Number(cookies.get(TX_COUNT) ?? 0);
    if (!count) return [];
    let payload = "";
    for (let i = 0; i < count; i++) payload += cookies.get(`${TX_PREFIX}${i}`) ?? "";
    const tuples: unknown = JSON.parse(decode(payload));
    if (!Array.isArray(tuples)) return [];
    return tuples.map(fromTuple).filter((tx): tx is Transaction => tx !== null);
  } catch {
    return [];
  }
}

export type SaveResult = { ok: true; bytes: number } | { ok: false; reason: "full" };

export function saveTransactions(txs: Transaction[]): SaveResult {
  const payload = serializeTransactions(txs);
  const chunks = Math.ceil(payload.length / CHUNK_SIZE);
  if (chunks > MAX_CHUNKS) return { ok: false, reason: "full" };

  const previous = Number(readCookies().get(TX_COUNT) ?? 0);
  for (let i = 0; i < chunks; i++) {
    writeCookie(`${TX_PREFIX}${i}`, payload.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
  }
  for (let i = chunks; i < previous; i++) writeCookie(`${TX_PREFIX}${i}`, "", 0);
  writeCookie(TX_COUNT, String(chunks));
  return { ok: true, bytes: payload.length };
}

export function storageUsed(): number {
  const cookies = readCookies();
  const count = Number(cookies.get(TX_COUNT) ?? 0);
  let bytes = 0;
  for (let i = 0; i < count; i++) bytes += cookies.get(`${TX_PREFIX}${i}`)?.length ?? 0;
  return bytes;
}

export function loadSettings(): Settings {
  const cookies = readCookies();
  const locale = cookies.get(LANG);
  const currency = cookies.get(CURRENCY);
  return {
    locale: locale === "en" ? "en" : "fa",
    currency: (["IRT", "IRR", "USD", "EUR"] as const).includes(currency as Currency)
      ? (currency as Currency)
      : "IRT",
  };
}

export function saveSettings(settings: Settings) {
  writeCookie(LANG, settings.locale satisfies Locale);
  writeCookie(CURRENCY, settings.currency);
}

export function clearTransactions() {
  const count = Number(readCookies().get(TX_COUNT) ?? 0);
  for (let i = 0; i < count; i++) writeCookie(`${TX_PREFIX}${i}`, "", 0);
  writeCookie(TX_COUNT, "", 0);
}
