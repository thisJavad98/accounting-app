"use client";

import { ArrowUpRight, Translate } from "@phosphor-icons/react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";
import type { LandingCopy } from "@/lib/landing-copy";
import type { Locale } from "@/lib/types";
import { MagneticLink } from "./magnetic-link";
import { setLandingLocale } from "./use-locale";
import { LogoMark } from "../logo";

export function LandingNav({ copy, locale }: { copy: LandingCopy; locale: Locale }) {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  useMotionValueEvent(scrollY, "change", (value) => {
    const next = value > 24;
    if (next !== solid) setSolid(next);
  });

  return (
    <motion.header
      className={`fixed inset-x-0 top-0 z-30 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        solid ? "border-b border-line bg-bg/80 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 md:px-8">
        <span className="inline-flex items-center gap-2 text-lg font-black tracking-tight text-brand">
          <LogoMark size={30} className="rounded-[9px]" />
          {copy.brand}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLandingLocale(locale === "fa" ? "en" : "fa")}
            lang={locale === "fa" ? "en" : "fa"}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted transition-colors hover:bg-sunken hover:text-ink"
          >
            <Translate size={18} aria-hidden />
            {copy.switchTo}
          </button>
          <MagneticLink
            href="/app"
            strength={0.2}
            className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-4 text-sm font-semibold text-bg"
          >
            {copy.openApp}
            <ArrowUpRight size={16} weight="bold" className="rtl:-scale-x-100" aria-hidden />
          </MagneticLink>
        </div>
      </nav>
    </motion.header>
  );
}
