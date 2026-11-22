"use client";

import { useEffect } from "react";
import {
  hasSeenPortfolioWhatsNew,
  markPortfolioWhatsNewSeen,
  PORTFOLIO_URL,
  showPortfolioPush,
} from "@/lib/feature-notify";
import { useStore } from "./store";

/** One-shot announcement that Savings / پس‌انداز shipped — toast + system push if allowed. */
export function WhatsNew() {
  const { t, sheet, notify } = useStore();

  useEffect(() => {
    if (hasSeenPortfolioWhatsNew()) return;
    // Wait out iOS paste / SMS sheets so the notice isn't buried or marked seen too early.
    if (sheet) return;

    const timer = window.setTimeout(() => {
      if (hasSeenPortfolioWhatsNew()) return;
      markPortfolioWhatsNewSeen();
      notify(t.toast.portfolioNew, "announce", PORTFOLIO_URL);
      void showPortfolioPush(t.appName, t.toast.portfolioNew);
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [sheet, notify, t]);

  return null;
}
