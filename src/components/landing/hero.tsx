"use client";

import { ArrowDown, ArrowUpRight, ChatText } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { LandingCopy } from "@/lib/landing-copy";
import type { Locale } from "@/lib/types";
import { MagneticLink } from "./magnetic-link";
import { PhoneFrame, Screenshot } from "./phone";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Story loop: idle day view, SMS notification drops in, then the entry sheet opens. */
const PHASES = [2600, 1800, 3200];

export function Hero({ copy, locale }: { copy: LandingCopy; locale: Locale }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const phoneRotate = useTransform(scrollYProgress, [0, 1], [0, locale === "fa" ? 6 : -6]);
  const discY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const discScale = useTransform(scrollYProgress, [0, 1], [1, 1.25]);

  useEffect(() => {
    if (reduce) return;
    const timer = setTimeout(() => setPhase((p) => (p + 1) % PHASES.length), PHASES[phase]);
    return () => clearTimeout(timer);
  }, [phase, reduce]);

  const words = copy.hero.title.split(" ");

  return (
    <section ref={ref} className="relative overflow-hidden">
      <div className="mx-auto grid min-h-[100dvh] max-w-7xl grid-cols-1 items-center gap-12 px-5 pt-24 pb-16 md:grid-cols-[1.1fr_0.9fr] md:gap-8 md:px-8">
        <div className="flex flex-col items-start gap-7">
          <h1 className="text-[2.6rem] font-black leading-[1.2] tracking-tight text-balance md:text-6xl lg:text-7xl ltr:leading-[1.05] ltr:tracking-tighter">
            {words.map((word, i) => (
              <span key={`${word}-${i}`} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
                <motion.span
                  className={`inline-block ${i === words.length - 1 || i === words.length - 2 ? "text-brand" : ""}`}
                  initial={reduce ? false : { y: "110%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.9, delay: 0.1 + i * 0.07, ease: EASE }}
                >
                  {word}
                </motion.span>
                {i < words.length - 1 && "\u00a0"}
              </span>
            ))}
          </h1>
          <motion.p
            className="max-w-[46ch] text-lg leading-relaxed text-muted md:text-xl"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.55, ease: EASE }}
          >
            {copy.hero.body}
          </motion.p>
          <motion.div
            className="flex flex-wrap items-center gap-3"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease: EASE }}
          >
            <MagneticLink
              href="/app"
              className="inline-flex h-14 items-center gap-2 whitespace-nowrap rounded-full bg-brand px-7 text-base font-bold text-on-brand shadow-[0_18px_40px_-18px_rgb(200_68_15/0.8)]"
            >
              {copy.openApp}
              <ArrowUpRight size={20} weight="bold" className="rtl:-scale-x-100" aria-hidden />
            </MagneticLink>
            <a
              href="#story"
              className="inline-flex h-14 items-center gap-2 whitespace-nowrap rounded-full px-5 text-base font-semibold text-ink transition-colors hover:bg-sunken"
            >
              {copy.howItWorks}
              <ArrowDown size={18} aria-hidden />
            </a>
          </motion.div>
        </div>

        <div className="relative mx-auto w-full max-w-[340px] md:max-w-[360px]">
          <motion.div
            aria-hidden
            style={reduce ? undefined : { y: discY, scale: discScale }}
            className="absolute inset-x-[-30%] top-[12%] aspect-square rounded-full bg-brand-soft"
          />
          <motion.div
            style={reduce ? undefined : { y: phoneY, rotate: phoneRotate }}
            initial={reduce ? false : { opacity: 0, y: 60, rotate: locale === "fa" ? -4 : 4 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ type: "spring", stiffness: 70, damping: 18, delay: 0.25 }}
            className="relative"
          >
            <PhoneFrame>
              <Screenshot locale={locale} shot="day" priority />
              <AnimatePresence>
                {phase === 2 && (
                  <motion.div
                    key="sheet"
                    className="absolute inset-0"
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 30 }}
                  >
                    <Screenshot locale={locale} shot="sms" />
                  </motion.div>
                )}
              </AnimatePresence>
            </PhoneFrame>

            <AnimatePresence>
              {(phase === 1 || reduce) && (
                <motion.div
                  key="toast"
                  className="absolute inset-x-[-6%] top-10 flex items-start gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-[0_24px_48px_-20px_rgb(var(--shadow)/0.45)]"
                  initial={{ y: -40, opacity: 0, scale: 0.94 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 120, opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                >
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-on-brand">
                    <ChatText size={22} weight="fill" aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-bold">{copy.hero.notification.from}</span>
                    <span className="truncate text-sm text-muted">{copy.hero.notification.text}</span>
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
