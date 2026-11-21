import type { LivePrices } from "./tgju";

export type PortfolioKind = "cash" | "gold" | "usd";

/**
 * User baseline: 1000 soot of 18k gold = 1 gram = TGJU `geram18` price.
 * Soot is a quantity unit (not jeweler purity).
 */
export const GOLD_SOOT_PER_GRAM = 1000;

export type PortfolioHolding = {
  id: string;
  kind: PortfolioKind;
  /** cash: amount in app currency | usd: USD count | gold: grams */
  quantity: number;
  /** Gold quantity in soot (1000 soot = 1g). Display / input unit. */
  soot?: number;
  /** Purchase cost in the app currency unit. */
  costBasis: number;
  /** Unit price at buy: per USD, or per gram at the holding's soot. */
  buyUnitPrice?: number;
  at: number;
  note?: string;
};

export type HoldingValuation = {
  holding: PortfolioHolding;
  value: number;
  profit: number;
  profitPct: number | null;
};

export type PortfolioSummary = {
  holdings: HoldingValuation[];
  totalCost: number;
  totalValue: number;
  totalProfit: number;
  totalProfitPct: number | null;
};

/** Convert soot quantity → grams (1000 soot = 1g). */
export function sootToGrams(soot: number): number {
  return soot / GOLD_SOOT_PER_GRAM;
}

/** Convert grams → soot quantity. */
export function gramsToSoot(grams: number): number {
  return grams * GOLD_SOOT_PER_GRAM;
}

/** Market price of one gram of 18k gold (= 1000 soot) from TGJU. */
export function goldGramPrice(gold18: number, _soot?: number): number {
  return gold18;
}

export function holdingValue(holding: PortfolioHolding, prices: LivePrices | null): number {
  if (holding.kind === "cash") return Math.round(holding.costBasis);
  if (!prices) return Math.round(holding.costBasis);

  if (holding.kind === "usd") {
    return Math.round(holding.quantity * prices.usd);
  }

  // gold: quantity is grams; 1g = site geram18 price (toman/rial → whole)
  return Math.round(holding.quantity * prices.gold18);
}

export function valueHolding(
  holding: PortfolioHolding,
  prices: LivePrices | null,
): HoldingValuation {
  const value = holdingValue(holding, prices);
  const cost = Math.round(holding.costBasis);
  const profit = value - cost;
  const profitPct = cost > 0 ? (profit / cost) * 100 : null;
  return { holding: { ...holding, costBasis: cost }, value, profit, profitPct };
}

export function summarizePortfolio(
  holdings: PortfolioHolding[],
  prices: LivePrices | null,
): PortfolioSummary {
  const valued = holdings.map((h) => valueHolding(h, prices));
  const totalCost = valued.reduce((s, v) => s + v.holding.costBasis, 0);
  const totalValue = valued.reduce((s, v) => s + v.value, 0);
  const totalProfit = totalValue - totalCost;
  const totalProfitPct = totalCost > 0 ? (totalProfit / totalCost) * 100 : null;
  return { holdings: valued, totalCost, totalValue, totalProfit, totalProfitPct };
}

/** Build a gold holding from grams + soot + optional buy-per-gram (else live). */
export function buildGoldFromGrams(input: {
  id: string;
  grams: number;
  soot: number;
  buyPerGram: number;
  at?: number;
  note?: string;
}): PortfolioHolding {
  return {
    id: input.id,
    kind: "gold",
    quantity: input.grams,
    soot: input.soot,
    costBasis: input.grams * input.buyPerGram,
    buyUnitPrice: input.buyPerGram,
    at: input.at ?? Date.now(),
    note: input.note,
  };
}

/** Convert a cash amount into gold grams using a unit price per gram. */
export function buildGoldFromAmount(input: {
  id: string;
  amount: number;
  soot: number;
  buyPerGram: number;
  at?: number;
  note?: string;
}): PortfolioHolding | null {
  if (input.buyPerGram <= 0 || input.amount <= 0) return null;
  const grams = input.amount / input.buyPerGram;
  return buildGoldFromGrams({
    id: input.id,
    grams,
    soot: input.soot,
    buyPerGram: input.buyPerGram,
    at: input.at,
    note: input.note,
  });
}

export function buildUsdHolding(input: {
  id: string;
  usdAmount: number;
  buyRate: number;
  at?: number;
  note?: string;
}): PortfolioHolding {
  return {
    id: input.id,
    kind: "usd",
    quantity: input.usdAmount,
    costBasis: input.usdAmount * input.buyRate,
    buyUnitPrice: input.buyRate,
    at: input.at ?? Date.now(),
    note: input.note,
  };
}

export function buildCashHolding(input: {
  id: string;
  amount: number;
  at?: number;
  note?: string;
}): PortfolioHolding {
  return {
    id: input.id,
    kind: "cash",
    quantity: input.amount,
    costBasis: input.amount,
    buyUnitPrice: 1,
    at: input.at ?? Date.now(),
    note: input.note,
  };
}
