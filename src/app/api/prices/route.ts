import { connection, NextResponse } from "next/server";
import { extractBitaGold18 } from "@/lib/bitaarts";
import {
  extractTgjuPrices,
  withGold18Ticker,
  type LivePriceItem,
  type LivePrices,
} from "@/lib/tgju";
import type { Currency } from "@/lib/types";

const TGJU_URL = "https://call1.tgju.org/ajax.json";
const BITA_URL = "https://api.bitaarts.ir/microservice/bita/financial/market-parameters";
const CACHE_MS = 60_000;

type TgjuCache = { at: number; feed: unknown };
type BitaCache = { at: number; payload: unknown };

let tgjuCache: TgjuCache | null = null;
let bitaCache: BitaCache | null = null;

function parseCurrency(raw: string | null): Currency {
  if (raw === "IRR" || raw === "USD" || raw === "EUR" || raw === "IRT") return raw;
  return "IRT";
}

async function loadTgjuFeed(): Promise<unknown> {
  const now = Date.now();
  if (tgjuCache && now - tgjuCache.at < CACHE_MS) return tgjuCache.feed;

  const res = await fetch(TGJU_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "dakhl-accounting/0.1",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`tgju ${res.status}`);
  }

  const feed: unknown = await res.json();
  tgjuCache = { at: now, feed };
  return feed;
}

async function loadBitaGold18(currency: Currency): Promise<LivePriceItem | null> {
  const now = Date.now();
  if (bitaCache && now - bitaCache.at < CACHE_MS) {
    return extractBitaGold18(bitaCache.payload, currency);
  }

  const res = await fetch(BITA_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "dakhl-accounting/0.1",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`bitaarts ${res.status}`);
  }

  const payload: unknown = await res.json();
  bitaCache = { at: now, payload };
  return extractBitaGold18(payload, currency);
}

export async function GET(request: Request) {
  await connection();
  const currency = parseCurrency(new URL(request.url).searchParams.get("currency"));

  try {
    const [tgjuResult, bitaResult] = await Promise.allSettled([
      loadTgjuFeed(),
      loadBitaGold18(currency),
    ]);

    if (tgjuResult.status === "rejected") {
      throw tgjuResult.reason instanceof Error
        ? tgjuResult.reason
        : new Error("tgju unavailable");
    }

    const extracted = extractTgjuPrices(tgjuResult.value, currency);
    if (!extracted) {
      return NextResponse.json({ error: "missing_quotes" }, { status: 502 });
    }

    const bitaGold =
      bitaResult.status === "fulfilled" ? bitaResult.value : null;
    const gold18Item = bitaGold ?? extracted.gold18Item;
    if (!gold18Item) {
      return NextResponse.json({ error: "missing_gold" }, { status: 502 });
    }

    const body: LivePrices = {
      usd: extracted.usd,
      usdt: extracted.usdt,
      gold18: gold18Item.value,
      usdItem: extracted.usdItem,
      usdtItem: extracted.usdtItem,
      gold18Item,
      ticker: withGold18Ticker(extracted.ticker, gold18Item),
      usdUpdatedAt: extracted.usdUpdatedAt,
      usdtUpdatedAt: extracted.usdtUpdatedAt,
      goldUpdatedAt: gold18Item.updatedAt,
      fetchedAt: Date.now(),
    };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch {
    if (tgjuCache) {
      const extracted = extractTgjuPrices(tgjuCache.feed, currency);
      const cachedBita = bitaCache
        ? extractBitaGold18(bitaCache.payload, currency)
        : null;
      const gold18Item = cachedBita ?? extracted?.gold18Item ?? null;
      if (extracted && gold18Item) {
        const body: LivePrices = {
          usd: extracted.usd,
          usdt: extracted.usdt,
          gold18: gold18Item.value,
          usdItem: extracted.usdItem,
          usdtItem: extracted.usdtItem,
          gold18Item,
          ticker: withGold18Ticker(extracted.ticker, gold18Item),
          usdUpdatedAt: extracted.usdUpdatedAt,
          usdtUpdatedAt: extracted.usdtUpdatedAt,
          goldUpdatedAt: gold18Item.updatedAt,
          fetchedAt: tgjuCache.at,
        };
        return NextResponse.json(body, { status: 200 });
      }
    }
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
