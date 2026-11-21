"use client";

import { TrendDown, TrendUp } from "@phosphor-icons/react";
import { useMemo } from "react";
import { Money } from "./money";
import { useStore } from "./store";
import { formatNumber } from "@/lib/format";
import type { TickerEntry, TickerId } from "@/lib/tgju";
import { useLivePrices } from "@/lib/use-live-prices";

function tickerLabel(id: TickerId, labels: Record<TickerId, string>): string {
  return labels[id];
}

function TickerChip({
  entry,
  label,
  locale,
}: {
  entry: TickerEntry;
  label: string;
  locale: "fa" | "en";
}) {
  const { item, format } = entry;
  const color =
    item.direction === "up"
      ? "text-success"
      : item.direction === "down"
        ? "text-danger"
        : "text-muted";
  const Icon = item.direction === "up" ? TrendUp : item.direction === "down" ? TrendDown : null;
  const pct = formatNumber(Math.abs(Math.round(item.changePct * 100) / 100), locale);

  return (
    <div className="inline-flex shrink-0 items-center gap-2.5 border-e border-line/80 px-4 py-2.5">
      <span className="whitespace-nowrap text-[11px] font-bold text-muted">{label}</span>
      <span className="inline-flex items-baseline gap-1 tabular-nums">
        {format === "usd" ? (
          <span className="text-sm font-black tracking-tight text-ink">
            <bdi>{formatNumber(item.value, locale)}</bdi>
          </span>
        ) : (
          <Money
            value={item.value}
            className="text-sm font-black tracking-tight"
            unitClassName="text-[10px] font-semibold text-muted"
          />
        )}
      </span>
      <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold tabular-nums ${color}`}>
        {Icon ? <Icon size={12} weight="bold" aria-hidden /> : null}
        <span>
          {item.direction === "down" ? "−" : item.direction === "up" ? "+" : ""}
          {pct}٪
        </span>
      </span>
    </div>
  );
}

export function LiveMarketTicker() {
  const { t, settings } = useStore();
  const locale = settings.locale;
  const { prices, loading } = useLivePrices(settings.currency);

  const labels: Record<TickerId, string> = useMemo(
    () => ({
      gold18: t.ticker.gold18,
      usd: t.ticker.usd,
      coin: t.ticker.coin,
      mesghal: t.ticker.mesghal,
      ounce: t.ticker.ounce,
    }),
    [t.ticker],
  );

  const entries = prices?.ticker ?? [];
  // Two identical halves so translate3d(-50%) loops without a jump.
  const loop = entries.length > 0 ? [...entries, ...entries] : [];

  return (
    <div className="sticky top-0 z-20 border-b border-line bg-bg/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="relative overflow-hidden" dir="ltr">
        <div className="pointer-events-none absolute inset-y-0 start-0 z-10 w-8 bg-gradient-to-r from-bg to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 end-0 z-10 w-8 bg-gradient-to-l from-bg to-transparent" />

        {loading && entries.length === 0 ? (
          <div className="px-4 py-3 text-xs text-muted">{t.prices.loading}</div>
        ) : entries.length === 0 ? (
          <div className="px-4 py-3 text-xs text-muted">{t.prices.unavailable}</div>
        ) : (
          <div className="live-ticker-track flex w-max items-stretch">
            {loop.map((entry, index) => (
              <TickerChip
                key={`${entry.id}-${index}`}
                entry={entry}
                label={tickerLabel(entry.id, labels)}
                locale={locale}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
