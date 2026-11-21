"use client";

import { ArrowsClockwise, CaretLeft, CaretRight, Coins, CurrencyDollar, TrendDown, TrendUp } from "@phosphor-icons/react";
import { AppLink } from "./app-link";
import { Money } from "./money";
import { useStore } from "./store";
import { primaryButton, secondaryButton } from "./ui";
import { formatNumber } from "@/lib/format";
import type { LivePriceItem } from "@/lib/tgju";
import { useLivePrices } from "@/lib/use-live-prices";

function DetailCard({
  title,
  icon: Icon,
  item,
  locale,
  updatedLabel,
}: {
  title: string;
  icon: typeof Coins;
  item: LivePriceItem;
  locale: "fa" | "en";
  updatedLabel: string;
}) {
  const color =
    item.direction === "up"
      ? "text-success"
      : item.direction === "down"
        ? "text-danger"
        : "text-muted";
  const Trend = item.direction === "up" ? TrendUp : item.direction === "down" ? TrendDown : null;
  const pct = formatNumber(Math.abs(Math.round(item.changePct * 100) / 100), locale);

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-sunken p-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink">
          <Icon size={24} weight="duotone" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-xs font-semibold text-muted">{title}</span>
          <Money
            value={item.value}
            className="text-2xl font-black tracking-tight"
            unitClassName="text-sm font-semibold text-muted"
          />
        </div>
      </div>
      <div className={`flex items-center gap-2 ${color}`}>
        {Trend ? <Trend size={16} weight="bold" aria-hidden /> : null}
        <span className="text-sm font-bold tabular-nums">
          {item.direction === "down" ? "−" : item.direction === "up" ? "+" : ""}
          {pct}٪
        </span>
        {item.change !== 0 && (
          <Money
            value={Math.abs(item.change)}
            className={`text-sm font-semibold ${color}`}
            unitClassName="text-[10px] text-muted"
          />
        )}
      </div>
      {item.updatedAt && (
        <p className="text-[11px] text-faint">
          {updatedLabel}: {item.updatedAt}
        </p>
      )}
    </section>
  );
}

export function PricesView() {
  const { t, settings } = useStore();
  const locale = settings.locale;
  const BackChevron = locale === "fa" ? CaretRight : CaretLeft;
  const ForwardChevron = locale === "fa" ? CaretLeft : CaretRight;
  const { prices, loading, error, refresh } = useLivePrices(settings.currency);

  return (
    <div className="flex flex-col gap-7 px-5 pb-28 pt-[max(env(safe-area-inset-top),1.5rem)]">
      <header className="flex flex-col gap-3">
        <AppLink
          href="/app/reports/savings"
          className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted"
        >
          <BackChevron size={16} weight="bold" aria-hidden />
          {t.prices.back}
        </AppLink>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black tracking-tight">{t.liveMarket.title}</h1>
          <p className="text-sm leading-relaxed text-muted">{t.prices.subtitle}</p>
        </div>
      </header>

      {loading && !prices && <p className="text-sm text-muted">{t.prices.loading}</p>}

      {error && !prices && (
        <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-line px-5 py-6">
          <p className="text-sm text-muted">{t.prices.unavailable}</p>
          <button type="button" onClick={refresh} className={`${secondaryButton} h-11 text-sm`}>
            <ArrowsClockwise size={16} weight="bold" aria-hidden />
            {t.prices.refresh}
          </button>
        </div>
      )}

      {prices && (
        <div className="flex flex-col gap-3">
          <DetailCard
            title={t.prices.gold18}
            icon={Coins}
            item={prices.gold18Item}
            locale={locale}
            updatedLabel={t.prices.updatedAt}
          />
          <DetailCard
            title={t.prices.usd}
            icon={CurrencyDollar}
            item={prices.usdItem}
            locale={locale}
            updatedLabel={t.prices.updatedAt}
          />
          <div className="flex flex-col gap-2">
            <button type="button" onClick={refresh} className={`${secondaryButton} h-11 text-sm`}>
              <ArrowsClockwise size={16} weight="bold" aria-hidden />
              {t.prices.refresh}
            </button>
            <p className="text-center text-[11px] text-faint">{t.prices.source}</p>
          </div>
        </div>
      )}

      <AppLink href="/app/reports/savings" className={`${primaryButton} h-12 text-sm`}>
        {t.prices.openPortfolio}
        <ForwardChevron size={16} weight="bold" aria-hidden />
      </AppLink>
    </div>
  );
}
