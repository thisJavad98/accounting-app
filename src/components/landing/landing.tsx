"use client";

import { useEffect } from "react";
import { landingCopy } from "@/lib/landing-copy";
import { Bento } from "./bento";
import { Hero } from "./hero";
import { LandingNav } from "./nav";
import { BankMarquee, FinalCta, Manifesto, SavingsShowcase, Steps } from "./sections";
import { SmsStory } from "./sms-story";
import { useLandingLocale } from "./use-locale";

export function Landing() {
  const locale = useLandingLocale();
  const copy = landingCopy[locale];

  useEffect(() => {
    // Older Shortcuts and share targets pointed at "/?sms=". Forward them into the app.
    const params = new URLSearchParams(location.search);
    if (params.has("sms") || params.has("text")) location.replace(`/app${location.search}`);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-bg text-ink">
      <LandingNav copy={copy} locale={locale} />
      <main>
        <Hero copy={copy} locale={locale} />
        <SmsStory copy={copy} />
        <SavingsShowcase copy={copy} locale={locale} />
        <Bento copy={copy} locale={locale} />
        <BankMarquee copy={copy} />
        <Manifesto copy={copy} />
        <Steps copy={copy} locale={locale} />
        <FinalCta copy={copy} locale={locale} />
      </main>
    </div>
  );
}
