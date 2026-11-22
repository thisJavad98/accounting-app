"use client";

import { useCallback, useEffect, useState } from "react";
import type { LivePrices } from "./tgju";
import type { Currency } from "./types";

const SESSION_KEY = "dk_prices_v4";

type PricesState = {
  prices: LivePrices | null;
  loading: boolean;
  error: boolean;
};

function isLivePrices(value: unknown): value is LivePrices {
  if (!value || typeof value !== "object") return false;
  const p = value as LivePrices;
  return (
    typeof p.usd === "number" &&
    typeof p.usdt === "number" &&
    typeof p.gold18 === "number" &&
    !!p.usdItem &&
    typeof p.usdItem.value === "number" &&
    !!p.usdtItem &&
    typeof p.usdtItem.value === "number" &&
    !!p.gold18Item &&
    typeof p.gold18Item.value === "number" &&
    Array.isArray(p.ticker)
  );
}

function readSession(currency: Currency): LivePrices | null {
  try {
    const raw = sessionStorage.getItem(`${SESSION_KEY}:${currency}`);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isLivePrices(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeSession(currency: Currency, prices: LivePrices) {
  try {
    sessionStorage.setItem(`${SESSION_KEY}:${currency}`, JSON.stringify(prices));
  } catch {
    // ignore quota / private mode
  }
}

function initialState(currency: Currency): PricesState {
  if (typeof window === "undefined") {
    return { prices: null, loading: true, error: false };
  }
  const cached = readSession(currency);
  return { prices: cached, loading: !cached, error: false };
}

export function useLivePrices(currency: Currency): PricesState & { refresh: () => void } {
  const [tick, setTick] = useState(0);
  const [{ prices, loading, error }, setState] = useState<PricesState>(() => initialState(currency));

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    async function load() {
      // Yield so cache/loading updates are not synchronous setState inside the effect body.
      await Promise.resolve();
      if (cancelled) return;

      const cached = readSession(currency);
      setState({
        prices: cached,
        loading: true,
        error: false,
      });

      try {
        const res = await fetch(`/api/prices?currency=${currency}`, {
          credentials: "same-origin",
          signal: ac.signal,
        });
        if (!res.ok) throw new Error("bad status");
        const data: unknown = await res.json();
        if (cancelled) return;
        if (!isLivePrices(data)) {
          throw new Error("bad payload");
        }
        writeSession(currency, data);
        setState({ prices: data, loading: false, error: false });
      } catch {
        if (cancelled || ac.signal.aborted) return;
        setState((prev) => ({
          prices: prev.prices ?? readSession(currency),
          loading: false,
          error: !(prev.prices || readSession(currency)),
        }));
      }
    }

    void load();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [currency, tick]);

  return { prices, loading, error, refresh };
}
