"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  ChartDonut,
  ChatText,
  NotePencil,
  PiggyBank,
  Prohibit,
  Trash,
} from "@phosphor-icons/react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import Image from "next/image";
import { useRef, useState } from "react";
import { formatNumber } from "@/lib/format";
import type { LandingCopy } from "@/lib/landing-copy";
import type { Locale } from "@/lib/types";
import { CategoryIcon } from "../category-icon";
import { MagneticLink } from "./magnetic-link";
import { PhoneFrame, Screenshot, type Shot } from "./phone";
import { setLandingLocale } from "./use-locale";
import { LogoMark } from "../logo";

/**
 * The mark each bank wears, in the order `landing-copy` lists them. Logos are the CC0 vectors from
 * github.com/zegond/logos-per-banks, which covers the established banks but neither neobank, so those
 * two fall back to a monogram in their house colour.
 */
const BANK_MARKS: { logo?: string; color: string }[] = [
  { logo: "mellat", color: "#E4007F" },
  { logo: "melli", color: "#0B6FB4" },
  { color: "#1A73E8" },
  { logo: "saderat", color: "#1C3F94" },
  { logo: "tejarat", color: "#00A0A8" },
  { logo: "saman", color: "#1B59F8" },
  { logo: "pasargad", color: "#B8912F" },
  { logo: "parsian", color: "#C8102E" },
  { logo: "sepah", color: "#1E6B3A" },
  { logo: "resalat", color: "#6A3FA0" },
  { logo: "ayandeh", color: "#00796B" },
  { logo: "shahr", color: "#D32F2F" },
  { logo: "maskan", color: "#1565C0" },
  { logo: "keshavarzi", color: "#2E7D32" },
  { logo: "refah", color: "#00897B" },
  { logo: "eghtesad-novin", color: "#512DA8" },
  { color: "#7B1FA2" },
  { logo: "sina", color: "#455A64" },
];

export function SavingsShowcase({ copy, locale }: { copy: LandingCopy; locale: Locale }) {
  const s = copy.savings;
  const c = s.card;
  const reduce = useReducedMotion();

  const [unnecessaryMap, setUnnecessaryMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(c.items.map((item) => [item.id, item.defaultUnnecessary])),
  );
  const [deletedIds, setDeletedIds] = useState<Record<string, boolean>>({});

  const visibleItems = c.items.filter((item) => !deletedIds[item.id]);
  const totalBuys = visibleItems.reduce((sum, item) => sum + item.amount, 0);
  const unnecessaryTotal = visibleItems
    .filter((item) => unnecessaryMap[item.id])
    .reduce((sum, item) => sum + item.amount, 0);
  const deletedSavings = c.items
    .filter((item) => deletedIds[item.id])
    .reduce((sum, item) => sum + item.amount, 0);
  const necessaryTotal = Math.max(0, totalBuys - unnecessaryTotal);
  const canSave = Math.max(unnecessaryTotal + deletedSavings, c.incomeAmount - necessaryTotal);
  const savingsPct = Math.min(100, Math.max(0, Math.round((canSave / c.incomeAmount) * 100)));
  const totalCutSavings = unnecessaryTotal + deletedSavings;

  const necessaryShare = Math.min(100, (necessaryTotal / c.incomeAmount) * 100);
  const cutShare = Math.min(100 - necessaryShare, (totalCutSavings / c.incomeAmount) * 100);

  function toggleItem(id: string) {
    setUnnecessaryMap((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function deleteUnnecessaryItems() {
    const nextDeleted = { ...deletedIds };
    let count = 0;
    for (const item of visibleItems) {
      if (unnecessaryMap[item.id]) {
        nextDeleted[item.id] = true;
        count += 1;
      }
    }
    if (count > 0) {
      setDeletedIds(nextDeleted);
    } else {
      // Reset demo if all were deleted
      setDeletedIds({});
      setUnnecessaryMap(Object.fromEntries(c.items.map((item) => [item.id, item.defaultUnnecessary])));
    }
  }

  const hasMarkedVisible = visibleItems.some((item) => unnecessaryMap[item.id]);

  return (
    <section className="mx-auto max-w-7xl px-5 py-24 md:px-8 md:py-32">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-start gap-6"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-xs font-bold text-brand-ink">
            <PiggyBank size={16} weight="fill" aria-hidden />
            {s.eyebrow}
          </span>
          <h2 className="text-3xl leading-[1.2] font-black tracking-tight text-balance md:text-5xl">
            {s.title}
          </h2>
          <p className="max-w-[48ch] text-base leading-relaxed text-muted md:text-lg">{s.body}</p>
          <MagneticLink
            href="/app/reports"
            className="inline-flex h-13 items-center gap-2 rounded-full bg-brand px-6 text-sm font-bold text-on-brand shadow-[0_14px_30px_-14px_rgb(200_68_15/0.75)]"
          >
            {s.cta}
            <ArrowUpRight size={18} weight="bold" className="rtl:-scale-x-100" aria-hidden />
          </MagneticLink>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.85, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-4 rounded-[2rem] border border-line bg-sunken p-5 shadow-[0_32px_70px_-35px_rgb(var(--shadow)/0.4)] md:p-7"
        >
          {/* Card Header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-brand text-on-brand">
                <PiggyBank size={22} weight="duotone" aria-hidden />
              </span>
              <span className="text-lg font-black tracking-tight">{c.monthBadge}</span>
              <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand-ink">
                {c.latestBadge}
              </span>
            </div>
            <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-brand-ink tabular-nums">
              {locale === "fa"
                ? `${formatNumber(savingsPct, locale)}٪ از ورودی ماه`
                : `${savingsPct}% of incoming money`}
            </span>
          </div>

          {/* Live Savings Summary Box */}
          <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 md:p-5">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted">{c.canSaveLabel}</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black tracking-tight text-brand-ink tabular-nums md:text-4xl">
                  +{formatNumber(canSave, locale)}
                </span>
                <span className="text-sm font-semibold text-muted">{c.unit}</span>
              </div>
              {totalCutSavings > 0 && (
                <p className="text-xs font-semibold text-brand-ink tabular-nums">
                  {c.savedFromCutsLabel} +{formatNumber(totalCutSavings, locale)} {c.unit}
                </p>
              )}
            </div>

            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-sunken" aria-hidden>
              <div
                className="h-full bg-ink/40 transition-all duration-300"
                style={{ width: `${necessaryShare}%` }}
              />
              <div
                className="h-full bg-brand transition-all duration-300"
                style={{ width: `${cutShare}%` }}
              />
            </div>

            <dl className="grid grid-cols-2 gap-2 pt-1">
              <div className="flex flex-col gap-0.5 rounded-xl bg-sunken px-3 py-2">
                <dt className="flex items-center gap-1 text-[11px] font-medium text-muted">
                  <ArrowDownLeft size={13} weight="bold" className="text-brand" aria-hidden />
                  {c.incomingLabel}
                </dt>
                <dd className="text-sm font-bold text-brand-ink tabular-nums">
                  +{formatNumber(c.incomeAmount, locale)}{" "}
                  <span className="text-[10px] font-medium text-muted">{c.unit}</span>
                </dd>
              </div>
              <div className="flex flex-col gap-0.5 rounded-xl bg-sunken px-3 py-2">
                <dt className="flex items-center gap-1 text-[11px] font-medium text-muted">
                  <ArrowUpRight size={13} weight="bold" aria-hidden />
                  {c.buysLabel}
                </dt>
                <dd className="text-sm font-bold tabular-nums">
                  {formatNumber(totalBuys, locale)}{" "}
                  <span className="text-[10px] font-medium text-muted">{c.unit}</span>
                </dd>
              </div>
            </dl>

            <dl className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5 rounded-xl bg-sunken px-3 py-2">
                <dt className="text-[11px] font-medium text-muted">{c.necessaryLabel}</dt>
                <dd className="text-xs font-bold tabular-nums">
                  {formatNumber(necessaryTotal, locale)}{" "}
                  <span className="text-[10px] font-medium text-muted">{c.unit}</span>
                </dd>
              </div>
              <div className="flex flex-col gap-0.5 rounded-xl bg-brand-soft px-3 py-2 text-brand-ink">
                <dt className="flex items-center gap-1 text-[11px] font-medium opacity-85">
                  <Prohibit size={12} weight="bold" aria-hidden />
                  {c.unnecessaryLabel}
                </dt>
                <dd className="text-xs font-bold tabular-nums">
                  {formatNumber(unnecessaryTotal, locale)}{" "}
                  <span className="text-[10px] font-medium opacity-75">{c.unit}</span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Interactive Buys List */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-muted">{c.hint}</p>
            <ul className="flex flex-col gap-1.5">
              {visibleItems.map((item) => {
                const isUnnecessary = !!unnecessaryMap[item.id];
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-pressed={isUnnecessary}
                      onClick={() => toggleItem(item.id)}
                      className="flex w-full items-center gap-3 rounded-2xl bg-surface px-3.5 py-2.5 text-start transition-transform active:scale-[0.99]"
                    >
                      <span
                        className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl ${
                          isUnnecessary ? "bg-brand-soft text-brand-ink" : "bg-sunken text-ink"
                        }`}
                      >
                        <CategoryIcon category={item.category} size={18} />
                      </span>
                      <span
                        className={`min-w-0 flex-1 truncate text-sm font-semibold ${
                          isUnnecessary ? "line-through opacity-55" : ""
                        }`}
                      >
                        {item.title}
                      </span>
                      <span
                        className={`shrink-0 text-sm font-bold tabular-nums ${
                          isUnnecessary ? "line-through opacity-50" : ""
                        }`}
                      >
                        {formatNumber(item.amount, locale)}{" "}
                        <span className="text-[10px] font-medium text-muted">{c.unit}</span>
                      </span>
                      <span
                        className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-bold transition-colors ${
                          isUnnecessary ? "bg-brand text-on-brand" : "bg-sunken text-muted"
                        }`}
                      >
                        <Prohibit size={12} weight={isUnnecessary ? "bold" : "regular"} aria-hidden />
                        {isUnnecessary ? c.keepLabel : c.markLabel}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {hasMarkedVisible && (
            <button
              type="button"
              onClick={deleteUnnecessaryItems}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-danger/12 px-5 text-xs font-bold text-danger transition-transform active:scale-[0.98]"
            >
              <Trash size={16} weight="bold" aria-hidden />
              {c.deleteAction}
            </button>
          )}
        </motion.div>
      </div>
    </section>
  );
}

export function BankMarquee({ copy }: { copy: LandingCopy }) {
  const row = [...copy.banks, ...copy.banks];
  return (
    <section className="border-y border-line py-10">
      <p className="mx-auto max-w-7xl px-5 text-sm font-semibold text-muted md:px-8">{copy.banksTitle}</p>
      <div dir="ltr" className="relative mt-6 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <div className="marquee flex w-max">
          {row.map((bank, i) => {
            const mark = BANK_MARKS[i % copy.banks.length];
            return (
              <span
                key={`${bank}-${i}`}
                aria-hidden={i >= copy.banks.length}
                className="me-3 inline-flex h-12 shrink-0 items-center gap-2.5 rounded-full bg-sunken ps-2 pe-5 text-base font-bold whitespace-nowrap"
              >
                {mark.logo ? (
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white">
                    <Image src={`/landing/banks/${mark.logo}.svg`} alt="" width={28} height={28} unoptimized />
                  </span>
                ) : (
                  <span
                    style={{ backgroundColor: mark.color }}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
                    aria-hidden
                  >
                    {bank.trim()[0]}
                  </span>
                )}
                {bank}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Word({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <motion.span style={{ opacity }} className="inline">
      {word}{" "}
    </motion.span>
  );
}

export function Manifesto({ copy }: { copy: LandingCopy }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const progress = useTransform(scrollYProgress, (v) => (reduce ? 1 : v));
  const words = copy.manifesto.text.split(" ");

  return (
    <section className="mx-auto max-w-5xl px-5 py-28 md:px-8 md:py-40">
      <p className="mb-6 text-xs font-bold tracking-[0.18em] text-brand uppercase">{copy.manifesto.eyebrow}</p>
      <p ref={ref} className="text-3xl leading-[1.45] font-black tracking-tight md:text-5xl md:leading-[1.35]">
        {words.map((word, i) => (
          <Word key={i} word={word} progress={progress} range={[i / words.length, (i + 1) / words.length]} />
        ))}
      </p>
    </section>
  );
}

const STEP_SHOTS: Shot[] = ["sms", "day", "month"];
const STEP_ICONS = [ChatText, NotePencil, ChartDonut];
const STEP_STYLES = [
  "bg-surface border border-line",
  "bg-brand-soft text-brand-ink",
  "bg-ink text-bg",
];

function StepCard({
  index,
  total,
  progress,
  title,
  body,
  locale,
}: {
  index: number;
  total: number;
  progress: MotionValue<number>;
  title: string;
  body: string;
  locale: Locale;
}) {
  const reduce = useReducedMotion();
  const scale = useTransform(progress, [index / total, 1], [1, 1 - (total - 1 - index) * 0.06]);
  const imageY = useTransform(progress, [index / total, (index + 1) / total], [80, 0]);
  const Glyph = STEP_ICONS[index];

  return (
    <div className="sticky h-[78dvh] min-h-[34rem]" style={{ top: `calc(5.5rem + ${index * 1.5}rem)` }}>
      <motion.article
        style={reduce ? undefined : { scale }}
        className={`grid h-full origin-top grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[2rem] md:grid-cols-[1.1fr_0.9fr] md:grid-rows-1 ${STEP_STYLES[index]}`}
      >
        <div className="flex flex-col gap-4 p-7 md:justify-between md:gap-6 md:p-12">
          <Glyph size={44} weight="duotone" className="opacity-70 md:size-14" aria-hidden />
          <div className="flex flex-col gap-3">
            <h3 className="text-3xl font-black tracking-tight md:text-6xl">{title}</h3>
            <p className="max-w-[40ch] text-base leading-relaxed opacity-80 md:text-lg">{body}</p>
          </div>
        </div>
        <div className="relative overflow-hidden">
          <motion.div
            style={reduce ? undefined : { y: imageY }}
            className="absolute inset-x-16 top-2 md:inset-x-12 md:top-12"
          >
            <PhoneFrame>
              <Screenshot locale={locale} shot={STEP_SHOTS[index]} sizes="(min-width: 768px) 320px, 55vw" />
            </PhoneFrame>
          </motion.div>
        </div>
      </motion.article>
    </div>
  );
}

export function Steps({ copy, locale }: { copy: LandingCopy; locale: Locale }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const items = copy.steps.items;

  return (
    <section className="mx-auto max-w-7xl px-5 py-24 md:px-8 md:py-32">
      <h2 className="mb-10 text-3xl font-black tracking-tight md:text-5xl">{copy.steps.title}</h2>
      <div ref={ref} className="relative flex flex-col gap-[12dvh]">
        {items.map((item, i) => (
          <StepCard
            key={item.title}
            index={i}
            total={items.length}
            progress={scrollYProgress}
            title={item.title}
            body={item.body}
            locale={locale}
          />
        ))}
      </div>
    </section>
  );
}

export function FinalCta({ copy, locale }: { copy: LandingCopy; locale: Locale }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const scale = useTransform(scrollYProgress, [0, 1], [0.92, 1]);
  const radius = useTransform(scrollYProgress, [0, 1], [64, 28]);

  return (
    <section ref={ref} className="px-3 pb-3 md:px-5 md:pb-5">
      <motion.div
        style={reduce ? { borderRadius: 28 } : { scale, borderRadius: radius }}
        className="relative overflow-hidden bg-brand text-on-brand"
      >
        <div className="mx-auto flex min-h-[80dvh] max-w-7xl flex-col items-start justify-end gap-10 px-6 py-16 md:px-10 md:py-24">
          <h2 className="max-w-[16ch] text-5xl leading-[1.15] font-black tracking-tight md:text-7xl ltr:leading-[1.02] ltr:tracking-tighter">
            {copy.final.title}
          </h2>
          <div className="flex w-full flex-col items-start justify-between gap-8 md:flex-row md:items-end">
            <p className="max-w-[36ch] text-lg opacity-90 md:text-xl">{copy.final.body}</p>
            <MagneticLink
              href="/app"
              className="inline-flex h-16 items-center gap-3 whitespace-nowrap rounded-full bg-on-brand px-9 text-lg font-black text-brand shadow-[0_24px_50px_-20px_rgb(0_0_0/0.45)]"
            >
              {copy.openApp}
              <ArrowUpRight size={22} weight="bold" className="rtl:-scale-x-100" aria-hidden />
            </MagneticLink>
          </div>
        </div>
      </motion.div>
      <footer className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-3 pt-8 pb-6 text-sm text-muted md:flex-row md:items-center">
        <span className="inline-flex items-center gap-2 font-black text-brand">
          <LogoMark size={24} className="rounded-[7px]" />
          {copy.brand}
        </span>
        <span>{copy.footer}</span>
        <button
          type="button"
          onClick={() => setLandingLocale(locale === "fa" ? "en" : "fa")}
          lang={locale === "fa" ? "en" : "fa"}
          className="font-semibold text-ink underline-offset-4 hover:underline"
        >
          {copy.switchTo}
        </button>
      </footer>
    </section>
  );
}

