import { deflateSync, inflateSync } from "fflate";
import {
  GOLD_SOOT_PER_GRAM,
  type PortfolioHolding,
  type PortfolioKind,
} from "./portfolio";

const COOKIE = "dk_sav";
const COMPRESSED = "z";
const MAX_AGE = 60 * 60 * 24 * 400;
const MAX_BYTES = 3500;

type HoldingTuple = [
  string,
  0 | 1 | 2,
  number,
  number,
  number,
  number | null,
  number,
  string?,
];

const KIND_CODES = { cash: 0, gold: 1, usd: 2 } as const satisfies Record<PortfolioKind, number>;

function kindFromCode(code: unknown): PortfolioKind {
  if (code === 1 || code === "gold") return "gold";
  if (code === 2 || code === "usd") return "usd";
  return "cash";
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  for (const part of document.cookie.split("; ")) {
    if (!part) continue;
    const eq = part.indexOf("=");
    if (part.slice(0, eq) === name) return part.slice(eq + 1);
  }
  return null;
}

function writeCookie(name: string, value: string, maxAge = MAX_AGE) {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function encode(text: string): string {
  const bytes = deflateSync(new TextEncoder().encode(text), { level: 9 });
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return COMPRESSED + btoa(binary);
}

function decode(payload: string): string {
  const compressed = payload.startsWith(COMPRESSED);
  const binary = atob(compressed ? payload.slice(COMPRESSED.length) : payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(compressed ? inflateSync(bytes) : bytes);
}

function toTuple(h: PortfolioHolding): HoldingTuple {
  return [
    h.id,
    KIND_CODES[h.kind],
    h.quantity,
    h.costBasis,
    Math.round(h.at / 1000),
    h.buyUnitPrice ?? null,
    h.kind === "gold" ? (h.soot ?? GOLD_SOOT_PER_GRAM) : 0,
    h.note ?? "",
  ];
}

function fromTuple(raw: unknown): PortfolioHolding | null {
  if (!Array.isArray(raw) || raw.length < 5) return null;
  const [id, kindCode, quantity, costBasis, at, buyUnitPrice, soot, note] = raw;
  if (typeof id !== "string" || typeof quantity !== "number" || typeof costBasis !== "number") {
    return null;
  }
  if (typeof at !== "number" || quantity < 0 || costBasis < 0) return null;

  const kind = kindFromCode(kindCode);
  const holding: PortfolioHolding = {
    id,
    kind,
    quantity,
    costBasis,
    at: at * 1000,
  };
  if (typeof buyUnitPrice === "number" && buyUnitPrice > 0) {
    holding.buyUnitPrice = buyUnitPrice;
  }
  if (kind === "gold") {
    holding.soot = typeof soot === "number" && soot > 0 ? soot : GOLD_SOOT_PER_GRAM;
  }
  if (typeof note === "string" && note) holding.note = note;
  return holding;
}

export type PortfolioSaveResult = { ok: true } | { ok: false; reason: "full" };

export function loadPortfolio(): PortfolioHolding[] {
  try {
    const payload = readCookie(COOKIE);
    if (!payload) return [];
    const tuples: unknown = JSON.parse(decode(payload));
    if (!Array.isArray(tuples)) return [];
    return tuples.map(fromTuple).filter((h): h is PortfolioHolding => h !== null);
  } catch {
    return [];
  }
}

export function savePortfolio(holdings: PortfolioHolding[]): PortfolioSaveResult {
  const payload = encode(JSON.stringify(holdings.map(toTuple)));
  if (payload.length > MAX_BYTES) return { ok: false, reason: "full" };
  writeCookie(COOKIE, payload);
  return { ok: true };
}

export function clearPortfolio() {
  writeCookie(COOKIE, "", 0);
}
