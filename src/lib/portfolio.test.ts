import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GOLD_SOOT_PER_GRAM,
  buildCashHolding,
  buildGoldFromAmount,
  buildGoldFromGrams,
  buildUsdHolding,
  goldGramPrice,
  sootToGrams,
  summarizePortfolio,
} from "./portfolio";
import type { LivePrices } from "./tgju";

const prices: LivePrices = {
  usd: 300_000,
  gold18: 20_000_000,
  usdItem: {
    value: 300_000,
    change: 0,
    changePct: 0,
    direction: "flat",
    updatedAt: null,
  },
  gold18Item: {
    value: 20_000_000,
    change: 0,
    changePct: 0,
    direction: "flat",
    updatedAt: null,
  },
  ticker: [
    {
      id: "gold18",
      item: {
        value: 20_000_000,
        change: 0,
        changePct: 0,
        direction: "flat",
        updatedAt: null,
      },
      format: "app",
    },
    {
      id: "usd",
      item: {
        value: 300_000,
        change: 0,
        changePct: 0,
        direction: "flat",
        updatedAt: null,
      },
      format: "app",
    },
  ],
  usdUpdatedAt: null,
  goldUpdatedAt: null,
  fetchedAt: Date.now(),
};

describe("portfolio valuation", () => {
  it("keeps cash P/L at zero", () => {
    const holding = buildCashHolding({ id: "c1", amount: 5_000_000 });
    const summary = summarizePortfolio([holding], prices);
    assert.equal(summary.totalValue, 5_000_000);
    assert.equal(summary.totalProfit, 0);
  });

  it("values USD against live rate and buy basis", () => {
    const holding = buildUsdHolding({ id: "u1", usdAmount: 20, buyRate: 200_000 });
    const summary = summarizePortfolio([holding], prices);
    assert.equal(holding.costBasis, 4_000_000);
    assert.equal(summary.totalValue, 6_000_000);
    assert.equal(summary.totalProfit, 2_000_000);
    assert.equal(summary.totalProfitPct, 50);
  });

  it("treats 1000 soot as 1g at the TGJU 18k quote", () => {
    assert.equal(sootToGrams(GOLD_SOOT_PER_GRAM), 1);
    assert.equal(sootToGrams(2500), 2.5);
    assert.equal(goldGramPrice(prices.gold18), prices.gold18);

    const holding = buildGoldFromGrams({
      id: "g1",
      grams: sootToGrams(2000),
      soot: 2000,
      buyPerGram: 18_000_000,
    });
    const summary = summarizePortfolio([holding], prices);
    assert.equal(holding.quantity, 2);
    assert.equal(summary.totalValue, 40_000_000);
    assert.equal(summary.totalProfit, 4_000_000);
  });

  it("converts gold cash amount into grams", () => {
    const holding = buildGoldFromAmount({
      id: "g2",
      amount: 25_000_000,
      soot: GOLD_SOOT_PER_GRAM,
      buyPerGram: 25_000_000,
    });
    assert.ok(holding);
    assert.equal(holding!.quantity, 1);
    assert.equal(holding!.costBasis, 25_000_000);
  });
});
