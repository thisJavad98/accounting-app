"use client";

import { useCallback, useEffect, useState } from "react";
import type { LivePrices } from "./tgju";
import type { Currency } from "./types";

const SESSION_KEY = "dk_prices_v3";

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
    typeof p.gold18 === "number" &&
    !!p.usdItem &&
    typeof p.usdItem.value === "number" &&
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

export function useLivePrices(currency: Currency): PricesState & { refresh: () => void } {
  const [prices, setPrices] = useState<LivePrices | null>(() =>
    typeof window === "undefined" ? null : readSession(currency),
  );
  const [loading, setLoading] = useState(!prices);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const cached = readSession(currency);
    if (cached) {
      setPrices(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    async function load() {
      try {
        const res = await fetch(`/api/prices?currency=${currency}`, {
          credentials: "same-origin",
        });
        if (!res.ok) throw new Error("bad status");
        const data: unknown = await res.json();
        if (cancelled) return;
        if (!isLivePrices(data)) {
          throw new Error("bad payload");
        }
        writeSession(currency, data);
        setPrices(data);
        setError(false);
      } catch {
        if (cancelled) return;
        if (!readSession(currency)) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [currency, tick]);

  return { prices, loading, error, refresh };
}
