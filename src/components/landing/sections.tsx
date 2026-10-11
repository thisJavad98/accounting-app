"use client";

import { ArrowUpRight, ChartDonut, ChatText, NotePencil } from "@phosphor-icons/react";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { LandingCopy } from "@/lib/landing-copy";
import type { Locale } from "@/lib/types";
import { MagneticLink } from "./magnetic-link";
import { PhoneFrame, Screenshot, type Shot } from "./phone";
import { setLandingLocale } from "./use-locale";
import { LogoMark } from "../logo";

export function BankMarquee({ copy }: { copy: LandingCopy }) {
  const row = [...copy.banks, ...copy.banks];
  return (
    <section className="border-y border-line py-10">
      <p className="mx-auto max-w-7xl px-5 text-sm font-semibold text-muted md:px-8">{copy.banksTitle}</p>
      <div dir="ltr" className="relative mt-6 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <div className="marquee flex w-max">
          {row.map((bank, i) => (
            <span
              key={`${bank}-${i}`}
              aria-hidden={i >= copy.banks.length}
              className="me-3 inline-flex h-12 shrink-0 items-center rounded-full bg-sunken px-6 text-base font-bold whitespace-nowrap"
            >
              {bank}
            </span>
          ))}
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
        className={`grid h-full origin-top grid-cols-1 overflow-hidden rounded-[2rem] md:grid-cols-[1.1fr_0.9fr] ${STEP_STYLES[index]}`}
      >
        <div className="flex flex-col justify-between gap-6 p-7 md:p-12">
          <Glyph size={56} weight="duotone" className="opacity-70" aria-hidden />
          <div className="flex flex-col gap-3">
            <h3 className="text-4xl font-black tracking-tight md:text-6xl">{title}</h3>
            <p className="max-w-[40ch] text-base leading-relaxed opacity-80 md:text-lg">{body}</p>
          </div>
        </div>
        <div className="relative hidden overflow-hidden md:block">
          <motion.div style={reduce ? undefined : { y: imageY }} className="absolute inset-x-12 top-12">
            <PhoneFrame>
              <Screenshot locale={locale} shot={STEP_SHOTS[index]} sizes="320px" />
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

export function FinalCta({
  copy,
  locale,
  onVisibility,
}: {
  copy: LandingCopy;
  locale: Locale;
  onVisibility: (visible: boolean) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { amount: 0.2 });
  useEffect(() => onVisibility(inView), [inView, onVisibility]);
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

export function FloatingCta({ copy, hidden }: { copy: LandingCopy; hidden: boolean }) {
  const { scrollY } = useScroll();
  const [past, setPast] = useState(false);
  useMotionValueEvent(scrollY, "change", (value) => {
    const next = value > window.innerHeight * 0.7;
    if (next !== past) setPast(next);
  });
  const show = past && !hidden;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)]"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
        >
          <MagneticLink
            href="/app"
            strength={0.2}
            className="inline-flex h-14 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-brand px-7 text-base font-bold text-on-brand shadow-[0_20px_40px_-14px_rgb(200_68_15/0.7)]"
          >
            {copy.openApp}
            <ArrowUpRight size={20} weight="bold" className="rtl:-scale-x-100" aria-hidden />
          </MagneticLink>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
