"use client";

import {
  Check,
  Copy,
  Desktop,
  DeviceMobile,
  DownloadSimple,
  FileCsv,
  Moon,
  Sun,
  Trash,
  UploadSimple,
  Warning,
  type Icon,
} from "@phosphor-icons/react";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { exportJson, parseBackup, STORAGE_CAPACITY, storageUsed } from "@/lib/cookie-store";
import { dayKey, fromDayKey, todayKey } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { SHORTCUT_URL } from "@/lib/site";
import type { Currency, Locale, Theme, Transaction } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";
import { LogoMark } from "./logo";
import { installPrompt } from "./service-worker";
import { useStore } from "./store";
import { chipClass, dangerButton, secondaryButton } from "./ui";

const LOCALES: Locale[] = ["fa", "en"];
const CURRENCIES: Currency[] = ["IRT", "IRR", "USD", "EUR"];
const THEMES: { value: Theme; icon: Icon }[] = [
  { value: "system", icon: Desktop },
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
];

function toCsv(txs: Transaction[], t: Dictionary, locale: Locale, currency: Currency) {
  const date = new Intl.DateTimeFormat(locale === "fa" ? "fa-IR-u-ca-persian-nu-latn" : "en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const rows = [...txs]
    .sort((a, b) => a.at - b.at)
    .map((tx) =>
      [
        date.format(fromDayKey(dayKey(new Date(tx.at)))),
        new Date(tx.at).toTimeString().slice(0, 5),
        tx.kind === "income" ? t.form.income : t.form.expense,
        tx.amount,
        t.currencies[currency],
        tx.title,
        tx.note,
        t.categories[tx.category],
        tx.bank,
        tx.balance ?? "",
      ]
        .map(cell)
        .join(","),
    );
  return "\uFEFF" + [t.settings.csvHeaders.map(cell).join(","), ...rows].join("\r\n");
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-bold">{title}</h2>
      {children}
    </section>
  );
}

const noop = () => () => {};

function InstallCard() {
  const { t } = useStore();
  const prompt = useSyncExternalStore(installPrompt.subscribe, installPrompt.get, () => null);
  const installed = useSyncExternalStore(
    noop,
    () => matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && navigator.standalone === true),
    () => false,
  );
  const ios = useSyncExternalStore(noop, () => /iphone|ipad|ipod/i.test(navigator.userAgent), () => false);

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-sunken p-4">
      <div className="flex items-start gap-3">
        <LogoMark size={48} className="shrink-0 rounded-xl" />
        <p className="text-sm leading-relaxed">{installed ? t.settings.installed : t.settings.installBody}</p>
      </div>
      {!installed &&
        (prompt ? (
          <button
            type="button"
            onClick={() => void installPrompt.show()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-bold text-on-brand active:scale-[0.98]"
          >
            <DeviceMobile size={18} weight="bold" aria-hidden />
            {t.settings.installButton}
          </button>
        ) : (
          <p className="text-sm leading-relaxed text-muted">{ios ? t.settings.installIos : t.settings.installOther}</p>
        ))}
    </div>
  );
}

export function SettingsView() {
  const { t, settings, transactions, setLocale, setCurrency, setTheme, replaceAll, notify } = useStore();
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const locale = settings.locale;

  const shortcutUrl = SHORTCUT_URL;
  // Recomputed whenever transactions change, since every change rewrites the cookies.
  const used = useMemo(() => (transactions ? storageUsed() : 0), [transactions]);
  const ratio = used / STORAGE_CAPACITY;
  const kb = (bytes: number) => formatNumber(Math.round((bytes / 1024) * 10) / 10, locale);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(shortcutUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      notify(shortcutUrl);
    }
  }

  function downloadBackup() {
    download(`dakhl-backup-${todayKey()}.json`, exportJson(transactions), "application/json");
  }

  function downloadCsv() {
    download(
      `dakhl-${todayKey()}.csv`,
      toCsv(transactions, t, locale, settings.currency),
      "text/csv;charset=utf-8",
    );
  }

  async function restoreBackup(file: File) {
    try {
      const restored = parseBackup(await file.text());
      const merged = new Map(transactions.map((tx) => [tx.id, tx]));
      for (const tx of restored) merged.set(tx.id, tx);
      if (replaceAll([...merged.values()])) {
        notify(t.settings.importDone(formatNumber(restored.length, locale)));
      }
    } catch {
      notify(t.settings.importError, "error");
    }
  }

  return (
    <div className="flex flex-col gap-9 px-5 pt-[max(env(safe-area-inset-top),1.5rem)]">
      <h1 className="text-2xl font-black tracking-tight">{t.settings.title}</h1>

      <Section title={t.settings.install}>
        <InstallCard />
      </Section>

      <Section title={t.settings.language}>
        <div className="flex gap-2">
          {LOCALES.map((value) => (
            <button
              key={value}
              type="button"
              lang={value}
              aria-pressed={locale === value}
              onClick={() => setLocale(value)}
              className={chipClass(locale === value)}
            >
              {t.languages[value]}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t.settings.theme}>
        <div className="flex gap-2">
          {THEMES.map(({ value, icon: Glyph }) => (
            <button
              key={value}
              type="button"
              aria-pressed={settings.theme === value}
              onClick={() => setTheme(value)}
              className={chipClass(settings.theme === value)}
            >
              <Glyph size={18} weight={settings.theme === value ? "fill" : "regular"} aria-hidden />
              {t.settings.themes[value]}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t.settings.currency}>
        <div className="flex flex-wrap gap-2">
          {CURRENCIES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={settings.currency === value}
              onClick={() => setCurrency(value)}
              className={chipClass(settings.currency === value)}
            >
              {t.currencies[value]}
            </button>
          ))}
        </div>
        <p className="text-sm leading-relaxed text-muted">{t.settings.currencyHelper}</p>
      </Section>

      <Section title={t.settings.smsTitle}>
        <div className="flex flex-col gap-4 rounded-2xl bg-sunken p-4 text-sm leading-relaxed">
          <p className="font-medium">{t.settings.smsAuto}</p>
          <p>{t.settings.smsAndroid}</p>
          <div className="flex flex-col gap-2.5">
            <p className="font-semibold">{t.settings.smsIos}</p>
            <ol className="flex flex-col gap-2">
              {t.settings.smsIosSteps.map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-brand-ink tabular-nums">
                    {formatNumber(i + 1, locale)}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-surface p-1.5 ps-3">
            <code dir="ltr" className="min-w-0 flex-1 text-start font-mono text-xs break-all">
              {shortcutUrl}
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
          <p className="text-muted">{t.settings.smsIosNote}</p>
        </div>
      </Section>

      <Section title={t.settings.storage}>
        <p className="text-sm leading-relaxed text-muted">{t.settings.storageBody}</p>
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold tabular-nums">
            {t.settings.used(kb(used), kb(STORAGE_CAPACITY))}
          </span>
          <span className="text-muted">{t.settings.entries(formatNumber(transactions.length, locale))}</span>
        </div>
        {ratio > 0.8 && (
          <p className="flex items-start gap-2 rounded-2xl bg-brand-soft px-4 py-3 text-sm font-medium text-brand-ink">
            <Warning size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
            {t.settings.nearlyFull}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={downloadBackup}
            disabled={transactions.length === 0}
            className={`${secondaryButton} h-12 px-3 text-sm`}
          >
            <DownloadSimple size={18} aria-hidden />
            {t.settings.export}
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className={`${secondaryButton} h-12 px-3 text-sm`}>
            <UploadSimple size={18} aria-hidden />
            {t.settings.import}
          </button>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          disabled={transactions.length === 0}
          className={`${secondaryButton} h-12 px-3 text-sm`}
        >
          <FileCsv size={18} aria-hidden />
          {t.settings.exportCsv}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void restoreBackup(file);
            event.target.value = "";
          }}
        />
        {confirmClear && <p className="text-sm font-medium text-danger">{t.settings.clearConfirm}</p>}
        <button
          type="button"
          disabled={transactions.length === 0}
          onClick={() => {
            if (!confirmClear) return setConfirmClear(true);
            replaceAll([]);
            setConfirmClear(false);
            notify(t.settings.cleared);
          }}
          className={`${dangerButton} h-12 text-sm`}
        >
          <Trash size={18} aria-hidden />
          {t.settings.clear}
        </button>
      </Section>
    </div>
  );
}
