import type { Currency } from "./types";

/** TGJU quotes Iranian market prices in Rial. */
export type TgjuQuote = {
  p: string;
  h?: string;
  l?: string;
  d?: string;
  dp?: number;
  dt?: string;
  t?: string;
  t_en?: string;
  ts?: string;
};

export type PriceDirection = "up" | "down" | "flat";

export type LivePriceItem = {
  value: number;
  change: number;
  changePct: number;
  direction: PriceDirection;
  updatedAt: string | null;
};

export type TickerId = "gold18" | "usd" | "coin" | "mesghal" | "ounce";

export type TickerEntry = {
  id: TickerId;
  item: LivePriceItem;
  /** `app` = convert rial→app currency; `usd` = leave as USD/global quote. */
  format: "app" | "usd";
};

export type LivePrices = {
  /** USD free-market rate in the app currency unit (IRT/IRR). */
  usd: number;
  /** 18k gold price per gram (= 1000 soot) in the app currency unit. */
  gold18: number;
  usdItem: LivePriceItem;
  gold18Item: LivePriceItem;
  ticker: TickerEntry[];
  usdUpdatedAt: string | null;
  goldUpdatedAt: string | null;
  fetchedAt: number;
};

export function parseTgjuNumber(raw: string | number | undefined | null): number | null {
  if (raw == null) return null;
  const text = String(raw).replace(/,/g, "").trim();
  const value = Number.parseFloat(text);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function parseTgjuSignedNumber(raw: string | number | undefined | null): number {
  if (raw == null) return 0;
  const text = String(raw).replace(/,/g, "").trim();
  const value = Number.parseFloat(text);
  return Number.isFinite(value) ? value : 0;
}

/** Convert a TGJU Rial quote into the app's display currency (whole toman/rial). */
export function rialToAppCurrency(rial: number, currency: Currency): number {
  if (currency === "IRR") return Math.round(rial);
  // IRT (toman) and foreign labels used as toman-equivalent for Iranian amounts.
  return Math.round(rial / 10);
}

function directionFromQuote(quote: TgjuQuote | undefined, change: number): PriceDirection {
  if (quote?.dt === "high") return "up";
  if (quote?.dt === "low") return "down";
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "flat";
}

function toItem(
  quote: TgjuQuote | undefined,
  currency: Currency,
  format: "app" | "usd",
): LivePriceItem | null {
  const valueRaw = parseTgjuNumber(quote?.p);
  if (valueRaw == null) return null;
  const changeRaw = parseTgjuSignedNumber(quote?.d);
  const changePct = typeof quote?.dp === "number" ? quote.dp : parseTgjuSignedNumber(quote?.dp);
  const direction = directionFromQuote(quote, changeRaw);
  const convert = (n: number) => (format === "app" ? rialToAppCurrency(n, currency) : n);
  const changeAbs = Math.abs(convert(changeRaw));
  const pctAbs = Math.abs(changePct);
  return {
    value: convert(valueRaw),
    change: direction === "down" ? -changeAbs : direction === "up" ? changeAbs : 0,
    changePct: direction === "down" ? -pctAbs : direction === "up" ? pctAbs : 0,
    direction,
    updatedAt: quote?.ts ?? null,
  };
}

const TICKER_KEYS: { id: TickerId; key: string; format: "app" | "usd" }[] = [
  { id: "gold18", key: "geram18", format: "app" },
  { id: "coin", key: "sekee", format: "app" },
  { id: "usd", key: "price_dollar_rl", format: "app" },
  { id: "mesghal", key: "mesghal", format: "app" },
  { id: "ounce", key: "ons", format: "usd" },
];

export function extractTgjuPrices(
  feed: unknown,
  currency: Currency,
): Omit<LivePrices, "fetchedAt"> | null {
  if (!feed || typeof feed !== "object") return null;
  const current = (feed as { current?: Record<string, TgjuQuote> }).current;
  if (!current || typeof current !== "object") return null;

  const usdItem = toItem(current.price_dollar_rl, currency, "app");
  const gold18Item = toItem(current.geram18, currency, "app");
  if (!usdItem || !gold18Item) return null;

  const ticker: TickerEntry[] = [];
  for (const row of TICKER_KEYS) {
    const item = toItem(current[row.key], currency, row.format);
    if (item) ticker.push({ id: row.id, item, format: row.format });
  }

  return {
    usd: usdItem.value,
    gold18: gold18Item.value,
    usdItem,
    gold18Item,
    ticker: ticker.length > 0 ? ticker : [
      { id: "gold18", item: gold18Item, format: "app" },
      { id: "usd", item: usdItem, format: "app" },
    ],
    usdUpdatedAt: usdItem.updatedAt,
    goldUpdatedAt: gold18Item.updatedAt,
  };
}
