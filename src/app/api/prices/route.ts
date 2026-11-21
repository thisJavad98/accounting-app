import { connection, NextResponse } from "next/server";
import { extractTgjuPrices, type LivePrices } from "@/lib/tgju";
import type { Currency } from "@/lib/types";

const TGJU_URL = "https://call1.tgju.org/ajax.json";
const CACHE_MS = 60_000;

type CacheEntry = { at: number; feed: unknown };

let cache: CacheEntry | null = null;

function parseCurrency(raw: string | null): Currency {
  if (raw === "IRR" || raw === "USD" || raw === "EUR" || raw === "IRT") return raw;
  return "IRT";
}

async function loadFeed(): Promise<unknown> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.feed;

  const res = await fetch(TGJU_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "dakhl-accounting/0.1",
    },
    // Bypass Next fetch cache; we keep our own short TTL.
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`tgju ${res.status}`);
  }

  const feed: unknown = await res.json();
  cache = { at: now, feed };
  return feed;
}

export async function GET(request: Request) {
  await connection();
  const currency = parseCurrency(new URL(request.url).searchParams.get("currency"));

  try {
    const feed = await loadFeed();
    const extracted = extractTgjuPrices(feed, currency);
    if (!extracted) {
      return NextResponse.json({ error: "missing_quotes" }, { status: 502 });
    }

    const body: LivePrices = { ...extracted, fetchedAt: Date.now() };
    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch {
    if (cache) {
      const extracted = extractTgjuPrices(cache.feed, currency);
      if (extracted) {
        const body: LivePrices = { ...extracted, fetchedAt: cache.at };
        return NextResponse.json(body, { status: 200 });
      }
    }
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
