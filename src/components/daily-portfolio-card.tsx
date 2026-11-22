"use client";

import { CaretLeft, CaretRight, PiggyBank, TrendDown, TrendUp } from "@phosphor-icons/react";
import { useMemo, useSyncExternalStore } from "react";
import { AppLink } from "./app-link";
import { Money } from "./money";
import { useStore } from "./store";
import { formatNumber } from "@/lib/format";
import { summarizePortfolio } from "@/lib/portfolio";
import {
  getPortfolioServerSnapshot,
  getPortfolioSnapshot,
  subscribePortfolio,
} from "@/lib/portfolio-store";
import { useLivePrices } from "@/lib/use-live-prices";

export function DailyPortfolioCard() {
  const { t, settings } = useStore();
  const locale = settings.locale;
  const Chevron = locale === "fa" ? CaretLeft : CaretRight;
  const holdings = useSyncExternalStore(
    subscribePortfolio,
    getPortfolioSnapshot,
    getPortfolioServerSnapshot,
  );
  const { prices } = useLivePrices(settings.currency);

  const summary = useMemo(() => summarizePortfolio(holdings, prices), [holdings, prices]);
  const hasHoldings = holdings.length > 0;
  const profit = summary.totalProfit;
  const profitPositive = profit >= 0;

  return (
    <AppLink
      href="/app/reports/savings"
      className="flex flex-col gap-3 rounded-2xl bg-sunken p-4 transition-transform active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
            <PiggyBank size={20} weight="duotone" aria-hidden />
          </span>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-xs font-bold tracking-wide text-muted">{t.portfolio.dayCardTitle}</h2>
            {hasHoldings ? (
              <Money
                value={summary.totalValue}
                className="text-lg font-black tracking-tight"
                unitClassName="text-xs font-semibold text-muted"
              />
            ) : (
              <p className="text-sm text-muted">{t.portfolio.dayCardEmpty}</p>
            )}
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-on-brand">
          {t.portfolio.dayCardAction}
          <Chevron size={12} weight="bold" aria-hidden />
        </span>
      </div>

      {hasHoldings && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2.5">
          <span className="text-xs font-medium text-muted">{t.portfolio.profitLoss}</span>
          <div className="flex items-center gap-2">
            {profitPositive ? (
              <TrendUp size={16} weight="bold" className="text-success" aria-hidden />
            ) : (
              <TrendDown size={16} weight="bold" className="text-danger" aria-hidden />
            )}
            <Money
              value={Math.abs(profit)}
              sign={profitPositive ? "+" : "-"}
              className={`text-sm font-bold ${profitPositive ? "text-success" : "text-danger"}`}
              unitClassName="text-[10px] text-muted"
            />
            {summary.totalProfitPct != null && (
              <span
                className={`text-xs font-bold tabular-nums ${
                  profitPositive ? "text-success" : "text-danger"
                }`}
              >
                {t.portfolio.profitPct(
                  formatNumber(Math.abs(Math.round(summary.totalProfitPct * 10) / 10), locale),
                )}
              </span>
            )}
          </div>
        </div>
      )}
    </AppLink>
  );
}
