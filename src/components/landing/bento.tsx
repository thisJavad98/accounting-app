"use client";

import { ArrowsHorizontal } from "@phosphor-icons/react";
import {
  animate,
  AnimatePresence,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { LandingCopy } from "@/lib/landing-copy";
import { toPersianDigits } from "@/lib/format";
import type { Locale } from "@/lib/types";
import { PhoneFrame, Screenshot } from "./phone";

const EASE = [0.16, 1, 0.3, 1] as const;

const reveal = (reduce: boolean | null, delay = 0) =>
  reduce
    ? {}
    : {
        initial: { opacity: 0, y: 40 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.25 },
        transition: { duration: 0.8, delay, ease: EASE },
      };

function CountUp({ to, locale, suffix }: { to: number; locale: Locale; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const value = useMotionValue(reduce ? to : 0);
  const text = useTransform(value, (v) => {
    const n = String(Math.round(v));
    return (locale === "fa" ? toPersianDigits(n) : n) + suffix;
  });
  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(value, to, { duration: 1.8, ease: EASE });
    return () => controls.stop();
  }, [inView, reduce, to, value]);
  return <motion.span ref={ref}>{text}</motion.span>;
}

function RotatingMonth({ months }: { months: string[] }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(6);
  useEffect(() => {
    if (reduce) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % months.length), 1600);
    return () => clearInterval(timer);
  }, [months.length, reduce]);
  return (
    <span className="relative inline-flex h-[1.4em] min-w-[6ch] overflow-hidden align-bottom">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={months[index]}
          className="inline-block"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          {months[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function ThemeCompare({ locale, hint }: { locale: Locale; hint: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const split = useMotionValue(50);
  const clip = useMotionTemplate`inset(0 0 0 ${split}%)`;
  const handleLeft = useMotionTemplate`${split}%`;

  function move(clientX: number) {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect) return;
    split.set(Math.min(95, Math.max(5, ((clientX - rect.left) / rect.width) * 100)));
  }

  return (
    <div
      ref={frame}
      dir="ltr"
      className="relative h-full min-h-56 cursor-ew-resize touch-pan-y select-none overflow-hidden"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event.clientX);
      }}
      onPointerMove={(event) => {
        if (event.buttons) move(event.clientX);
      }}
      role="img"
      aria-label={hint}
    >
      <Image
        src={`/landing/${locale}-light-day.png`}
        alt=""
        fill
        sizes="(min-width: 768px) 400px, 90vw"
        className="object-cover object-top"
      />
      <motion.div className="absolute inset-0" style={{ clipPath: clip }}>
        <Image
          src={`/landing/${locale}-dark-day.png`}
          alt=""
          fill
          sizes="(min-width: 768px) 400px, 90vw"
          className="object-cover object-top"
        />
      </motion.div>
      <motion.div
        className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-brand"
        style={{ left: handleLeft }}
        aria-hidden
      >
        <span className="absolute top-1/2 left-1/2 inline-flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-on-brand shadow-lg">
          <ArrowsHorizontal size={20} weight="bold" />
        </span>
      </motion.div>
    </div>
  );
}

export function Bento({ copy, locale }: { copy: LandingCopy; locale: Locale }) {
  const reduce = useReducedMotion();
  const b = copy.bento;

  return (
    <section className="mx-auto max-w-7xl px-5 py-24 md:px-8 md:py-32">
      <motion.h2 {...reveal(reduce)} className="max-w-[20ch] text-3xl font-black tracking-tight md:text-5xl">
        {b.title}
      </motion.h2>

      <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-6 md:auto-rows-[15rem]">
        <motion.article
          {...reveal(reduce)}
          className="group relative flex flex-col overflow-hidden rounded-[1.75rem] bg-sunken md:col-span-4 md:row-span-2"
        >
          <div className="relative z-10 flex flex-col gap-2 p-7 md:max-w-[55%]">
            <h3 className="text-2xl font-black tracking-tight">{b.report.title}</h3>
            <p className="leading-relaxed text-muted">{b.report.body}</p>
          </div>
          <motion.div
            className="mx-auto mt-auto w-[62%] translate-y-6 md:absolute md:end-10 md:top-10 md:mt-0 md:w-[38%] md:translate-y-0"
            initial={reduce ? false : { y: 120 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ type: "spring", stiffness: 60, damping: 16 }}
          >
            <PhoneFrame className="transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-3">
              <Screenshot locale={locale} shot="month" sizes="(min-width: 768px) 300px, 60vw" />
            </PhoneFrame>
          </motion.div>
        </motion.article>

        <motion.article
          {...reveal(reduce, 0.08)}
          className="relative flex min-h-[26rem] flex-col overflow-hidden rounded-[1.75rem] bg-brand text-on-brand md:col-span-2 md:row-span-2 md:min-h-0"
        >
          <div className="flex flex-col gap-2 p-7">
            <h3 className="text-2xl font-black tracking-tight">{b.ask.title}</h3>
            <p className="leading-relaxed opacity-90">{b.ask.body}</p>
          </div>
          <motion.div
            className="absolute inset-x-8 -bottom-24"
            initial={reduce ? false : { rotate: locale === "fa" ? -12 : 12, y: 80 }}
            whileInView={{ rotate: locale === "fa" ? -6 : 6, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ type: "spring", stiffness: 60, damping: 14, delay: 0.15 }}
          >
            <PhoneFrame>
              <Screenshot locale={locale} shot="sms" sizes="(min-width: 768px) 280px, 70vw" />
            </PhoneFrame>
          </motion.div>
        </motion.article>

        <motion.article
          {...reveal(reduce, 0.05)}
          className="flex flex-col justify-between gap-6 rounded-[1.75rem] border border-line bg-surface p-7 md:col-span-2"
        >
          <p className="text-6xl font-black tracking-tighter text-brand tabular-nums md:text-7xl">
            <CountUp to={100} locale={locale} suffix={b.privacy.suffix} />
          </p>
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold">{b.privacy.title}</h3>
            <p className="text-sm leading-relaxed text-muted">{b.privacy.body}</p>
          </div>
        </motion.article>

        <motion.article
          {...reveal(reduce, 0.1)}
          className="relative flex flex-col justify-between gap-6 overflow-hidden rounded-[1.75rem] bg-[repeating-linear-gradient(135deg,var(--sunken)_0_12px,var(--bg)_12px_24px)] p-7 md:col-span-2"
        >
          <p className="text-4xl font-black tracking-tight md:text-5xl">
            <RotatingMonth months={copy.months} /> <span className="text-brand">{copy.year}</span>
          </p>
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold">{b.calendar.title}</h3>
            <p className="text-sm leading-relaxed text-muted">{b.calendar.body}</p>
          </div>
        </motion.article>

        <motion.article
          {...reveal(reduce, 0.15)}
          className="flex min-h-[22rem] flex-col overflow-hidden rounded-[1.75rem] border border-line bg-surface md:col-span-2 md:min-h-0"
        >
          <div className="flex items-baseline justify-between gap-3 px-6 pt-5 pb-3">
            <h3 className="text-lg font-bold">{b.themes.title}</h3>
            <p className="text-sm text-muted">{b.themes.body}</p>
          </div>
          <div className="flex-1">
            <ThemeCompare locale={locale} hint={b.themes.body} />
          </div>
        </motion.article>
      </div>
    </section>
  );
}
