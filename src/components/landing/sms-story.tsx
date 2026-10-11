"use client";

import { Sparkle } from "@phosphor-icons/react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import type { LandingCopy } from "@/lib/landing-copy";

/** Scroll progress window in which field `index` of `count` lights up. */
const windowFor = (index: number, count: number) => {
  const start = 0.1 + (index / count) * 0.72;
  return [start, start + 0.08] as const;
};

function Token({
  text,
  progress,
  index,
  count,
}: {
  text: string;
  progress: MotionValue<number>;
  index: number;
  count: number;
}) {
  const [a, b] = windowFor(index, count);
  const opacity = useTransform(progress, [a, b], [0, 1]);
  const scale = useTransform(progress, [a, b], [0.85, 1]);
  return (
    <span className="relative inline-block px-1">
      <motion.span
        aria-hidden
        style={{ opacity, scale }}
        className="absolute inset-0 -z-0 rounded-md bg-brand/20 ring-1 ring-brand/40"
      />
      <span className="relative">{text}</span>
    </span>
  );
}

function Field({
  label,
  value,
  progress,
  index,
  count,
}: {
  label: string;
  value: string;
  progress: MotionValue<number>;
  index: number;
  count: number;
}) {
  const [a, b] = windowFor(index, count);
  const opacity = useTransform(progress, [a, b], [0.18, 1]);
  const x = useTransform(progress, [a, b], [24, 0]);
  const dot = useTransform(progress, [a, b], [0, 1]);
  return (
    <motion.div style={{ opacity, x }} className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-b-0">
      <span className="flex items-center gap-2.5 text-sm text-muted md:text-base">
        <motion.span style={{ scale: dot }} className="size-2 rounded-full bg-brand" aria-hidden />
        {label}
      </span>
      <span className="text-base font-bold md:text-lg">{value}</span>
    </motion.div>
  );
}

export function SmsStory({ copy }: { copy: LandingCopy }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const fields = copy.story.fields;
  const count = fields.length;
  const progress = useTransform(scrollYProgress, (v) => (reduce ? 1 : v));
  const askOpacity = useTransform(progress, [0.86, 0.94], [0, 1]);
  const askY = useTransform(progress, [0.86, 0.94], [20, 0]);
  const bubbleRotate = useTransform(progress, [0, 1], [-3, 2]);

  return (
    <section id="story" ref={ref} className="relative h-[320vh] scroll-mt-0">
      <div className="sticky top-0 flex min-h-[100dvh] items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 px-5 py-20 md:grid-cols-2 md:gap-16 md:px-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <h2 className="text-3xl font-black tracking-tight md:text-5xl">{copy.story.title}</h2>
              <p className="max-w-[48ch] text-base leading-relaxed text-muted md:text-lg">{copy.story.body}</p>
            </div>
            <motion.div
              style={reduce ? undefined : { rotate: bubbleRotate }}
              className="relative max-w-md rounded-[1.75rem] rounded-ss-md bg-sunken p-5 text-base leading-[2.1] whitespace-pre-line md:text-lg"
              dir="auto"
            >
              {copy.story.sms.map((segment, i) =>
                typeof segment === "string" ? (
                  <span key={i}>{segment}</span>
                ) : (
                  <Token key={i} text={segment.text} progress={progress} index={segment.field} count={count} />
                ),
              )}
            </motion.div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-[1.75rem] border border-line bg-surface p-5 shadow-[0_30px_60px_-40px_rgb(var(--shadow)/0.5)] md:p-7">
              {fields.map((field, i) => (
                <Field key={field.label} {...field} progress={progress} index={i} count={count} />
              ))}
            </div>
            <motion.p
              style={{ opacity: askOpacity, y: askY }}
              className="flex items-center gap-2 text-lg font-bold text-brand-ink md:text-xl"
            >
              <Sparkle size={22} weight="fill" className="shrink-0 text-brand" aria-hidden />
              {copy.story.ask}
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  );
}
