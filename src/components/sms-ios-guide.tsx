"use client";

import { CaretLeft, Check, Copy, Info } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { formatNumber } from "@/lib/format";
import { SHORTCUT_URL } from "@/lib/site";
import {
  AddTriggerScreen,
  AutomationListScreen,
  ConfigureTriggerScreen,
  DescribeScreen,
  LibraryScreen,
  OpenUrlsScreen,
  SmsArrivesScreen,
  UrlEncodeScreen,
} from "./ios-mockups";
import { useStore } from "./store";
import { secondaryButton } from "./ui";

export function ShortcutUrl() {
  const { t, notify } = useStore();
  const [copied, setCopied] = useState(false);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(SHORTCUT_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      notify(SHORTCUT_URL);
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-surface p-1.5 ps-3">
      <code dir="ltr" className="min-w-0 flex-1 text-start font-mono text-xs break-all">
        {SHORTCUT_URL}
        <span className="text-brand-ink">[URL Encoded Text]</span>
      </code>
      <button
        type="button"
        onClick={copyUrl}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-brand px-3.5 text-xs font-bold text-on-brand active:scale-95"
      >
        {copied ? <Check size={14} weight="bold" aria-hidden /> : <Copy size={14} aria-hidden />}
        {copied ? t.settings.copied : t.settings.copy}
      </button>
    </div>
  );
}

export function SmsIosGuide() {
  const { t, settings } = useStore();
  const g = t.smsGuide;
  const locale = settings.locale;
  const { sender, keyword, sms } = g.mock;
  const label = (i: number) => g.steps[i].title;

  const screens = [
    <LibraryScreen key="library" label={label(0)} />,
    <AutomationListScreen key="automation" label={label(1)} />,
    <DescribeScreen key="describe" label={label(2)} />,
    <AddTriggerScreen key="trigger" label={label(3)} />,
    <ConfigureTriggerScreen key="configure" label={label(4)} keyword={keyword} />,
    <UrlEncodeScreen key="encode" label={label(5)} keyword={keyword} />,
    <OpenUrlsScreen key="open" label={label(6)} url={SHORTCUT_URL} />,
    <SmsArrivesScreen key="done" label={label(7)} locale={locale} sender={sender} sms={sms} />,
  ];
  const linkStep = 6;

  return (
    <div className="flex flex-col gap-9 px-5 pt-[max(env(safe-area-inset-top),1.5rem)]">
      <div className="flex flex-col gap-4">
        <Link
          href="/app/settings"
          className="inline-flex h-10 w-fit items-center gap-1 rounded-full bg-sunken ps-2.5 pe-4 text-sm font-medium text-ink active:scale-[0.97]"
        >
          <CaretLeft size={16} weight="bold" className="rtl:rotate-180" aria-hidden />
          {g.back}
        </Link>
        <h1 className="text-2xl font-black tracking-tight">{g.title}</h1>
        <p className="text-sm leading-relaxed text-muted">{g.intro}</p>
      </div>

      <ol className="flex flex-col gap-10">
        {g.steps.map((step, i) => (
          <li key={step.title} className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-on-brand tabular-nums">
                {formatNumber(i + 1, locale)}
              </span>
              <div className="flex flex-col gap-1.5 pt-1">
                <p className="text-xs font-medium text-muted">{g.step(formatNumber(i + 1, locale))}</p>
                <h2 className="font-bold">{step.title}</h2>
                <p className="text-sm leading-relaxed">{step.body}</p>
              </div>
            </div>
            {i === linkStep && (
              <div className="flex flex-col gap-2 rounded-2xl bg-sunken p-3">
                <p className="text-xs font-semibold text-muted">{g.linkLabel}</p>
                <ShortcutUrl />
              </div>
            )}
            <div className="rounded-2xl bg-sunken py-6">{screens[i]}</div>
          </li>
        ))}
      </ol>

      <section className="flex flex-col gap-3 rounded-2xl bg-brand-soft p-4 text-brand-ink">
        <h2 className="flex items-center gap-2 font-bold">
          <Info size={20} weight="fill" aria-hidden />
          {g.troubleTitle}
        </h2>
        <ul className="flex list-disc flex-col gap-2 ps-5 text-sm leading-relaxed">
          {g.trouble.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl bg-sunken p-4">
        <h2 className="font-bold">{g.olderTitle}</h2>
        <p className="text-sm leading-relaxed text-muted">{g.older}</p>
      </section>

      <Link href="/app/settings" className={`${secondaryButton} h-12 text-sm`}>
        <CaretLeft size={18} className="rtl:rotate-180" aria-hidden />
        {g.back}
      </Link>
    </div>
  );
}
