"use client";

import {
  CaretLeft,
  CaretRight,
  Coins,
  CurrencyDollar,
  PiggyBank,
  Plus,
  Trash,
  TrendDown,
  TrendUp,
  Wallet,
} from "@phosphor-icons/react";
import { AnimatePresence } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppLink } from "./app-link";
import { LiveMarketTicker } from "./live-market-ticker";
import { Money } from "./money";
import { Sheet } from "./sheet";
import { useStore } from "./store";
import { chipClass, inputClass, primaryButton } from "./ui";
import {
  formatAmountInput,
  formatGramsValue,
  formatMoney,
  formatMoneyInput,
  formatNumber,
  isIntegerCurrency,
  newId,
  parseAmount,
  parseMoney,
  roundMoney,
} from "@/lib/format";
import type { Currency } from "@/lib/types";
import {
  GOLD_SOOT_PER_GRAM,
  buildCashHolding,
  buildGoldFromGrams,
  buildUsdHolding,
  gramsToSoot,
  sootToGrams,
  summarizePortfolio,
  type PortfolioHolding,
  type PortfolioKind,
} from "@/lib/portfolio";
import { loadPortfolio, savePortfolio } from "@/lib/portfolio-store";
import { useLivePrices } from "@/lib/use-live-prices";
import type { LivePrices } from "@/lib/tgju";
import type { Locale } from "@/lib/types";

type GoldMode = "grams" | "amount";

const kindIcons = {
  cash: Wallet,
  gold: Coins,
  usd: CurrencyDollar,
} as const;

function formatGoldNumber(
  value: number,
  locale: Locale,
  fractionDigits: 0 | 2 | 3 = 0,
): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  if (fractionDigits === 3) return formatGramsValue(value, locale);
  if (fractionDigits === 0) return formatAmountInput(String(Math.round(value)), locale, 0);
  const rounded = Math.round(value * 100) / 100;
  return formatAmountInput(String(rounded), locale, 2);
}

function formatAppMoney(value: number, locale: Locale, currency: Currency): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  return formatMoney(value, locale, currency);
}

function AddPortfolioSheet({
  locale,
  prices,
  onClose,
  onSave,
}: {
  locale: Locale;
  prices: LivePrices | null;
  onClose: () => void;
  onSave: (holding: PortfolioHolding) => boolean;
}) {
  const { t, notify, settings } = useStore();
  const currency = settings.currency;
  const [kind, setKind] = useState<PortfolioKind>("cash");
  const [goldMode, setGoldMode] = useState<GoldMode>("grams");
  const [cashText, setCashText] = useState("");
  const [usdText, setUsdText] = useState("");
  const [usdRateText, setUsdRateText] = useState("");
  const [gramsText, setGramsText] = useState("");
  const [sootText, setSootText] = useState("");
  const [goldRateText, setGoldRateText] = useState("");
  const [goldRateDirty, setGoldRateDirty] = useState(false);
  const [goldAmountText, setGoldAmountText] = useState("");
  const [note, setNote] = useState("");

  function liveGoldPerGram(): number {
    return roundMoney(prices?.gold18 ?? 0, currency);
  }

  function applyLiveBuyPrice() {
    const live = liveGoldPerGram();
    if (live <= 0 || goldRateDirty) return;
    setGoldRateText(formatAppMoney(live, locale, currency));
  }

  function syncFromSoot(raw: string) {
    const formatted = formatAmountInput(raw, locale, 3);
    setSootText(formatted);
    const sootQty = parseAmount(formatted);
    if (sootQty > 0) {
      setGramsText(formatGoldNumber(sootToGrams(sootQty), locale, 3));
      applyLiveBuyPrice();
    } else {
      setGramsText("");
    }
  }

  function syncFromGrams(raw: string) {
    const formatted = formatAmountInput(raw, locale, 3);
    setGramsText(formatted);
    const grams = parseAmount(formatted);
    if (grams > 0) {
      setSootText(formatGoldNumber(gramsToSoot(grams), locale, 3));
      applyLiveBuyPrice();
    } else {
      setSootText("");
    }
  }

  function syncFromBuyPrice(raw: string) {
    const formatted = formatMoneyInput(raw, locale, currency);
    setGoldRateText(formatted);
    setGoldRateDirty(true);
    const buyPerGram = parseMoney(formatted, currency);
    if (buyPerGram <= 0) return;

    // Amount mode: total cash + buy price → grams & soot
    if (goldMode === "amount") {
      const amount = parseMoney(goldAmountText, currency);
      if (amount > 0) {
        const grams = amount / buyPerGram;
        setGramsText(formatGoldNumber(grams, locale, 3));
        setSootText(formatGoldNumber(gramsToSoot(grams), locale, 3));
      }
      return;
    }

    // Grams/soot mode: keep quantity; buy price only changes cost basis on save.
    const sootQty = parseAmount(sootText);
    const grams = parseAmount(gramsText);
    if (sootQty <= 0 && grams <= 0) return;
    if (sootQty > 0 && grams <= 0) {
      setGramsText(formatGoldNumber(sootToGrams(sootQty), locale, 3));
    } else if (grams > 0 && sootQty <= 0) {
      setSootText(formatGoldNumber(gramsToSoot(grams), locale, 3));
    }
  }

  function syncFromAmount(raw: string) {
    const formatted = formatMoneyInput(raw, locale, currency);
    setGoldAmountText(formatted);
    const amount = parseMoney(formatted, currency);
    const buyPerGram = parseMoney(goldRateText, currency) || liveGoldPerGram();
    if (amount > 0 && buyPerGram > 0) {
      const grams = amount / buyPerGram;
      setGramsText(formatGoldNumber(grams, locale, 3));
      setSootText(formatGoldNumber(gramsToSoot(grams), locale, 3));
      if (!goldRateDirty && liveGoldPerGram() > 0) {
        setGoldRateText(formatAppMoney(liveGoldPerGram(), locale, currency));
      }
    }
  }

  function handleSave() {
    const id = newId();
    const noteValue = note.trim() || undefined;
    let holding: PortfolioHolding | null = null;

    if (kind === "cash") {
      const amount = parseMoney(cashText, currency);
      if (amount <= 0) {
        notify(t.portfolio.invalidAmount, "error");
        return;
      }
      holding = buildCashHolding({ id, amount, note: noteValue });
    } else if (kind === "usd") {
      const usdAmount = parseAmount(usdText);
      if (usdAmount <= 0) {
        notify(t.portfolio.invalidAmount, "error");
        return;
      }
      const liveRate = roundMoney(prices?.usd ?? 0, currency);
      const buyRate = parseMoney(usdRateText, currency) || liveRate;
      if (buyRate <= 0) {
        notify(t.portfolio.invalidAmount, "error");
        return;
      }
      holding = buildUsdHolding({
        id,
        usdAmount,
        buyRate,
        note: noteValue,
      });
      holding.costBasis = roundMoney(holding.costBasis, currency);
    } else {
      // 1000 soot = 1g of 18k = TGJU geram18.
      const livePerGram = liveGoldPerGram();
      const buyPerGram = parseMoney(goldRateText, currency) || livePerGram;
      if (buyPerGram <= 0) {
        notify(t.portfolio.invalidAmount, "error");
        return;
      }

      if (goldMode === "grams") {
        const sootQty = parseAmount(sootText);
        const gramsEntered = parseAmount(gramsText);
        let grams = 0;
        let soot = 0;
        if (sootQty > 0) {
          grams = sootToGrams(sootQty);
          soot = sootQty;
        } else if (gramsEntered > 0) {
          grams = gramsEntered;
          soot = gramsToSoot(gramsEntered);
        } else {
          notify(t.portfolio.invalidAmount, "error");
          return;
        }
        holding = buildGoldFromGrams({ id, grams, soot, buyPerGram, note: noteValue });
        holding.costBasis = roundMoney(holding.costBasis, currency);
        holding.buyUnitPrice = roundMoney(buyPerGram, currency);
      } else {
        const amount = parseMoney(goldAmountText, currency);
        if (amount <= 0) {
          notify(t.portfolio.invalidAmount, "error");
          return;
        }
        const grams = amount / buyPerGram;
        const soot = gramsToSoot(grams);
        holding = buildGoldFromGrams({ id, grams, soot, buyPerGram, note: noteValue });
        holding.costBasis = roundMoney(amount, currency);
        holding.buyUnitPrice = roundMoney(buyPerGram, currency);
      }
    }

    if (onSave(holding)) {
      notify(t.portfolio.savedToast);
      onClose();
    }
  }

  return (
    <Sheet title={t.portfolio.addTitle} onClose={onClose}>
      <div className="flex flex-col gap-4 pb-2">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(kindIcons) as PortfolioKind[]).map((k) => {
            const Icon = kindIcons[k];
            return (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={chipClass(kind === k)}
              >
                <Icon size={16} weight="duotone" aria-hidden />
                {t.portfolio.kinds[k]}
              </button>
            );
          })}
        </div>

        {kind === "cash" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted">{t.portfolio.cashAmount}</span>
            <input
              inputMode={isIntegerCurrency(currency) ? "numeric" : "decimal"}
              className={inputClass}
              value={cashText}
              onChange={(e) => setCashText(formatMoneyInput(e.target.value, locale, currency))}
              autoFocus
            />
          </label>
        )}

        {kind === "usd" && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted">{t.portfolio.usdAmount}</span>
              <input
                inputMode="decimal"
                className={inputClass}
                value={usdText}
                onChange={(e) => setUsdText(formatAmountInput(e.target.value, locale))}
                autoFocus
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted">{t.portfolio.usdBuyRate}</span>
              <input
                inputMode="decimal"
                className={inputClass}
                value={usdRateText}
                placeholder={
                  prices ? formatAppMoney(prices.usd, locale, currency) : undefined
                }
                onChange={(e) =>
                  setUsdRateText(formatMoneyInput(e.target.value, locale, currency))
                }
              />
              <span className="text-[11px] text-muted">{t.portfolio.usdBuyRateHint}</span>
            </label>
          </>
        )}

        {kind === "gold" && (
          <>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={goldMode === "grams"}
                onClick={() => setGoldMode("grams")}
                className={chipClass(goldMode === "grams")}
              >
                {t.portfolio.goldModeGrams}
              </button>
              <button
                type="button"
                aria-pressed={goldMode === "amount"}
                onClick={() => setGoldMode("amount")}
                className={chipClass(goldMode === "amount")}
              >
                {t.portfolio.goldModeAmount}
              </button>
            </div>
            {goldMode === "grams" ? (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted">{t.portfolio.goldSoot}</span>
                  <input
                    inputMode="decimal"
                    className={inputClass}
                    value={sootText}
                    placeholder={formatAmountInput(String(GOLD_SOOT_PER_GRAM), locale)}
                    onChange={(e) => syncFromSoot(e.target.value)}
                    autoFocus
                  />
                  <span className="text-[11px] text-muted">{t.portfolio.goldSootHint}</span>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted">{t.portfolio.goldGrams}</span>
                  <input
                    inputMode="decimal"
                    className={inputClass}
                    value={gramsText}
                    onChange={(e) => syncFromGrams(e.target.value)}
                    placeholder={formatGramsValue(1, locale)}
                  />
                  <span className="text-[11px] text-muted">{t.portfolio.goldGramsHint}</span>
                </label>
              </>
            ) : (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted">{t.portfolio.goldAmount}</span>
                  <input
                    inputMode={isIntegerCurrency(currency) ? "numeric" : "decimal"}
                    className={inputClass}
                    value={goldAmountText}
                    onChange={(e) => syncFromAmount(e.target.value)}
                    autoFocus
                  />
                  <span className="text-[11px] text-muted">{t.portfolio.goldAmountHint}</span>
                </label>
                {(parseAmount(sootText) > 0 || parseAmount(gramsText) > 0) && (
                  <p className="text-xs text-muted">
                    {t.portfolio.sootLabel(sootText || "0")}
                    {" · "}
                    {t.portfolio.gramsLabel(gramsText || "0")}
                  </p>
                )}
              </>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted">{t.portfolio.goldBuyPerGram}</span>
              <input
                inputMode={isIntegerCurrency(currency) ? "numeric" : "decimal"}
                className={inputClass}
                value={goldRateText}
                placeholder={
                  prices ? formatAppMoney(prices.gold18, locale, currency) : undefined
                }
                onChange={(e) => syncFromBuyPrice(e.target.value)}
              />
              <span className="text-[11px] text-muted">{t.portfolio.goldBuyPerGramHint}</span>
            </label>
          </>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted">{t.portfolio.note}</span>
          <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        <button type="button" onClick={handleSave} className={`${primaryButton} h-12 text-sm`}>
          {t.portfolio.save}
        </button>
      </div>
    </Sheet>
  );
}

export function PortfolioView() {
  const { t, settings, notify } = useStore();
  const locale = settings.locale;
  const BackChevron = locale === "fa" ? CaretRight : CaretLeft;

  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const { prices } = useLivePrices(settings.currency);

  useEffect(() => {
    setHoldings(loadPortfolio());
    setHydrated(true);
  }, []);

  const persist = useCallback(
    (next: PortfolioHolding[]) => {
      const result = savePortfolio(next);
      if (!result.ok) {
        notify(t.portfolio.fullToast, "error");
        return false;
      }
      setHoldings(next);
      return true;
    },
    [notify, t.portfolio.fullToast],
  );

  const summary = useMemo(() => summarizePortfolio(holdings, prices), [holdings, prices]);

  function handleAdd(holding: PortfolioHolding) {
    return persist([holding, ...holdings]);
  }

  function handleDelete(id: string) {
    if (persist(holdings.filter((h) => h.id !== id))) {
      notify(t.portfolio.deletedToast);
    }
  }

  return (
    <div className="flex flex-col pb-28">
      <LiveMarketTicker />
      <div className="flex flex-col gap-7 px-5 pt-5">
      <header className="flex flex-col gap-3">
        <AppLink
          href="/app"
          className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted"
        >
          <BackChevron size={16} weight="bold" aria-hidden />
          {t.portfolio.back}
        </AppLink>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black tracking-tight">{t.portfolio.title}</h1>
          <p className="text-sm leading-relaxed text-muted">{t.portfolio.subtitle}</p>
        </div>
      </header>

      {hydrated && holdings.length > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl bg-sunken p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-on-brand">
              <PiggyBank size={24} weight="duotone" aria-hidden />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-xs font-semibold text-muted">{t.portfolio.totalValue}</span>
              <Money
                value={summary.totalValue}
                className="text-2xl font-black tracking-tight"
                unitClassName="text-sm font-semibold text-muted"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2.5">
            <span className="text-xs font-medium text-muted">{t.portfolio.totalProfit}</span>
            <div className="flex items-center gap-2">
              {summary.totalProfit >= 0 ? (
                <TrendUp size={16} weight="bold" className="text-success" aria-hidden />
              ) : (
                <TrendDown size={16} weight="bold" className="text-danger" aria-hidden />
              )}
              <Money
                value={Math.abs(summary.totalProfit)}
                sign={summary.totalProfit >= 0 ? "+" : "-"}
                className={`text-sm font-bold ${summary.totalProfit >= 0 ? "text-success" : "text-danger"}`}
                unitClassName="text-[10px] text-muted"
              />
              {summary.totalProfitPct != null && (
                <span
                  className={`text-xs font-bold tabular-nums ${
                    summary.totalProfit >= 0 ? "text-success" : "text-danger"
                  }`}
                >
                  {t.portfolio.profitPct(
                    formatNumber(Math.abs(Math.round(summary.totalProfitPct * 10) / 10), locale),
                  )}
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        {hydrated && holdings.length > 0 && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className={`${primaryButton} h-12 text-sm`}
          >
            <Plus size={18} weight="bold" aria-hidden />
            {t.portfolio.addTitle}
          </button>
        )}

        {!hydrated ? null : holdings.length === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-line px-5 py-7">
            <div className="flex flex-col gap-2">
              <h2 className="font-bold">{t.portfolio.emptyTitle}</h2>
              <p className="text-sm leading-relaxed text-muted">{t.portfolio.emptyBody}</p>
            </div>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className={`${primaryButton} h-11 w-auto px-5 text-sm`}
            >
              <Plus size={16} weight="bold" aria-hidden />
              {t.portfolio.addTitle}
            </button>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {summary.holdings.map(({ holding, value, profit, profitPct }) => {
              const MetaIcon = kindIcons[holding.kind];
              return (
                <li key={holding.id} className="flex flex-col gap-3 rounded-2xl bg-sunken p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
                        <MetaIcon size={18} weight="duotone" aria-hidden />
                      </span>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-bold">{t.portfolio.kinds[holding.kind]}</span>
                        <span className="text-xs text-muted">
                          {holding.kind === "cash" && (
                            <Money
                              value={holding.quantity}
                              className="text-xs font-semibold text-muted"
                              unitClassName="text-[10px] text-faint"
                            />
                          )}
                          {holding.kind === "usd" &&
                            t.portfolio.usdLabel(formatNumber(holding.quantity, locale))}
                          {holding.kind === "gold" && (
                            <>
                              {t.portfolio.sootLabel(
                                formatNumber(
                                  holding.soot ?? gramsToSoot(holding.quantity),
                                  locale,
                                ),
                              )}
                              {" · "}
                              {t.portfolio.gramsLabel(
                                formatGramsValue(holding.quantity, locale) ||
                                  formatNumber(holding.quantity, locale),
                              )}
                            </>
                          )}
                        </span>
                        {holding.note && (
                          <span className="truncate text-xs text-faint">{holding.note}</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(holding.id)}
                      className="inline-flex size-9 items-center justify-center rounded-full text-muted active:bg-surface"
                      aria-label={t.portfolio.delete}
                    >
                      <Trash size={18} weight="bold" aria-hidden />
                    </button>
                  </div>

                  <dl className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-0.5 rounded-xl bg-surface px-3 py-2">
                      <dt className="text-[11px] font-medium text-muted">{t.portfolio.initial}</dt>
                      <dd>
                        <Money
                          value={holding.costBasis}
                          className="text-xs font-bold"
                          unitClassName="text-[10px] text-muted"
                        />
                      </dd>
                    </div>
                    <div className="flex flex-col gap-0.5 rounded-xl bg-surface px-3 py-2">
                      <dt className="text-[11px] font-medium text-muted">{t.portfolio.valueToday}</dt>
                      <dd>
                        <Money
                          value={value}
                          className="text-xs font-bold"
                          unitClassName="text-[10px] text-muted"
                        />
                      </dd>
                    </div>
                  </dl>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted">{t.portfolio.profitLoss}</span>
                    <div className="flex items-center gap-2">
                      <Money
                        value={Math.abs(profit)}
                        sign={profit >= 0 ? "+" : "-"}
                        className={`text-sm font-bold ${profit >= 0 ? "text-success" : "text-danger"}`}
                        unitClassName="text-[10px] text-muted"
                      />
                      {profitPct != null && (
                        <span
                          className={`text-xs font-bold tabular-nums ${
                            profit >= 0 ? "text-success" : "text-danger"
                          }`}
                        >
                          {t.portfolio.profitPct(
                            formatNumber(Math.abs(Math.round(profitPct * 10) / 10), locale),
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <AnimatePresence>
        {addOpen && (
          <AddPortfolioSheet
            key="add-portfolio"
            locale={locale}
            prices={prices}
            onClose={() => setAddOpen(false)}
            onSave={handleAdd}
          />
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
