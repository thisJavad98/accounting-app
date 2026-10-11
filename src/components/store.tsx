"use client";

import {
  createContext,
  use,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { browser } from "react-dom";
import {
  clearTransactions,
  loadSettings,
  loadTransactions,
  saveSettings,
  saveTransactions,
} from "@/lib/cookie-store";
import { dayKey, todayKey, type DayKey } from "@/lib/dates";
import { newId } from "@/lib/format";
import { dictionaries, type Dictionary } from "@/lib/i18n";
import { parseBankSms } from "@/lib/sms-parser";
import type { Currency, Locale, Settings, Theme, Transaction } from "@/lib/types";

export type Sheet =
  | { type: "add" }
  | { type: "sms" }
  | { type: "calendar" }
  | { type: "tx"; id: string | null; sms?: string }
  | { type: "confirm"; tx: Transaction; sms: string }
  | null;

type Toast = { id: number; message: string; tone: "neutral" | "error" };

type StoreValue = {
  t: Dictionary;
  settings: Settings;
  transactions: Transaction[];
  selectedDay: DayKey;
  sheet: Sheet;
  toast: Toast | null;
  setLocale: (locale: Locale) => void;
  setCurrency: (currency: Currency) => void;
  setTheme: (theme: Theme) => void;
  setSelectedDay: (day: DayKey) => void;
  openSheet: (sheet: Sheet) => void;
  closeSheet: () => void;
  notify: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: () => void;
  saveTransaction: (tx: Transaction) => boolean;
  deleteTransaction: (id: string) => void;
  replaceAll: (txs: Transaction[]) => boolean;
  /** Shows a parsed bank SMS for confirmation; nothing is saved until `confirmSms`. */
  receiveSms: (raw: string) => boolean;
  confirmSms: (tx: Transaction) => void;
  rejectSms: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside StoreProvider");
  return value;
}

function smsToTransaction(raw: string, currency: Currency): Transaction | null {
  const parsed = parseBankSms(raw);
  if (!parsed) return null;
  const toCurrency = (value: number) => (currency === "IRT" && parsed.inRial ? Math.round(value / 10) : value);
  return {
    id: newId(),
    kind: parsed.kind,
    amount: toCurrency(parsed.amount),
    at: parsed.at ?? Date.now(),
    title: parsed.suggestedTitle.trim() || parsed.bank,
    note: "",
    category: parsed.category,
    bank: parsed.bank,
    balance: parsed.balance === null ? null : toCurrency(parsed.balance),
  };
}

/**
 * The same SMS handed over twice (link and clipboard) parses identically, so it is matched on every field.
 * Two different payments can share an amount and a minute, and the balance left over tells them apart.
 */
function findSame(transactions: Transaction[], tx: Transaction) {
  return transactions.find(
    (item) =>
      item.at === tx.at &&
      item.amount === tx.amount &&
      item.kind === tx.kind &&
      item.bank === tx.bank &&
      item.balance === tx.balance,
  );
}

/**
 * The clipboard keeps an SMS around for days, so only a message the bank dated today counts as new.
 * An SMS that states no date at all is given the current time by the parser and so passes.
 */
function arrivedToday(tx: Transaction) {
  return dayKey(new Date(tx.at)) === todayKey();
}

/** Reads a bank SMS handed over by the Android share sheet (`?text=`) or an iOS Shortcut (`?sms=` or `#sms=`). */
function readIncomingSms(): string | null {
  const query = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.slice(1));
  return query.get("sms") || query.get("text") || hash.get("sms") || null;
}

function stripIncomingSms() {
  const url = new URL(location.href);
  for (const key of ["sms", "text", "title"]) url.searchParams.delete(key);
  if (new URLSearchParams(url.hash.slice(1)).has("sms")) url.hash = "";
  history.replaceState(history.state, "", url.pathname + url.search + url.hash);
}

type InitialState = {
  settings: Settings;
  transactions: Transaction[];
  sheet: Sheet;
  incoming: boolean;
  notice: "duplicate" | "old" | null;
  raw: string | null;
};

function createInitialState(): InitialState {
  const settings = loadSettings();
  const transactions = loadTransactions();
  const raw = readIncomingSms();
  const tx = raw ? smsToTransaction(raw, settings.currency) : null;
  const base = { settings, transactions, incoming: !!raw, raw };
  if (raw && tx && !arrivedToday(tx)) {
    return { ...base, sheet: null, notice: "old" };
  }
  if (raw && tx && findSame(transactions, tx)) {
    return { ...base, sheet: null, notice: "duplicate" };
  }
  if (raw && tx) {
    return { ...base, sheet: { type: "confirm", tx, sms: raw }, notice: null };
  }
  return { ...base, sheet: raw ? { type: "sms" } : null, notice: null };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  use(browser("Accounting data is stored in browser cookies."));

  const [initial] = useState(createInitialState);
  const [settings, setSettings] = useState(initial.settings);
  const [transactions, setTransactions] = useState(initial.transactions);
  const [selectedDay, setSelectedDay] = useState<DayKey>(todayKey);
  const [sheet, setSheet] = useState<Sheet>(initial.sheet);
  const [toast, setToast] = useState<Toast | null>(() =>
    initial.notice
      ? { id: 0, message: dictionaries[initial.settings.locale].confirmSms[initial.notice], tone: "neutral" }
      : null,
  );
  const toastId = useRef(0);

  const t = dictionaries[settings.locale];

  useEffect(() => {
    if (initial.incoming) stripIncomingSms();
  }, [initial]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = settings.locale;
    root.dir = settings.locale === "fa" ? "rtl" : "ltr";
  }, [settings.locale]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "system") delete root.dataset.theme;
    else root.dataset.theme = settings.theme;
  }, [settings.theme]);

  const notify = useCallback((message: string, tone: Toast["tone"] = "neutral") => {
    toastId.current += 1;
    setToast({ id: toastId.current, message, tone });
  }, []);

  const commit = useCallback(
    (next: Transaction[]) => {
      const result = saveTransactions(next);
      if (!result.ok) {
        notify(t.toast.full, "error");
        return false;
      }
      setTransactions(next);
      return true;
    },
    [notify, t],
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const next = { ...settings, ...patch };
      saveSettings(next);
      setSettings(next);
    },
    [settings],
  );

  const saveTransaction = useCallback(
    (tx: Transaction) => {
      const exists = transactions.some((item) => item.id === tx.id);
      const next = exists
        ? transactions.map((item) => (item.id === tx.id ? tx : item))
        : [...transactions, tx];
      return commit(next);
    },
    [commit, transactions],
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      if (commit(transactions.filter((item) => item.id !== id))) notify(t.toast.deleted);
    },
    [commit, notify, t, transactions],
  );

  const replaceAll = useCallback(
    (txs: Transaction[]) => {
      if (txs.length === 0) {
        clearTransactions();
        setTransactions([]);
        return true;
      }
      return commit(txs);
    },
    [commit],
  );

  const receiveSms = useCallback(
    (raw: string) => {
      const tx = smsToTransaction(raw, settings.currency);
      if (!tx) return false;
      const same = findSame(transactions, tx);
      if (!arrivedToday(tx)) {
        setSheet(null);
        notify(t.confirmSms.old);
      } else if (same) {
        setSelectedDay(dayKey(new Date(same.at)));
        setSheet(null);
        notify(t.confirmSms.duplicate);
      } else {
        setSheet({ type: "confirm", tx, sms: raw });
      }
      return true;
    },
    [notify, settings.currency, t, transactions],
  );

  // A running Home Screen web app is brought forward with the Shortcut's URL instead of being reloaded, so
  // the SMS is looked for again whenever the page resurfaces.
  const handledSms = useRef(new Set(initial.raw ? [initial.raw] : []));

  useEffect(() => {
    const check = () => {
      const raw = readIncomingSms();
      if (!raw || handledSms.current.has(raw)) return;
      handledSms.current.add(raw);
      stripIncomingSms();
      if (!receiveSms(raw)) setSheet({ type: "sms" });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    const events = ["pageshow", "popstate", "hashchange", "focus"] as const;
    for (const name of events) window.addEventListener(name, check);
    document.addEventListener("visibilitychange", onVisible);
    check();
    return () => {
      for (const name of events) window.removeEventListener(name, check);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [receiveSms]);

  const confirmSms = useCallback(
    (tx: Transaction) => {
      if (!commit([...transactions, tx])) return;
      setSelectedDay(dayKey(new Date(tx.at)));
      setSheet(null);
      notify(t.toast.saved);
    },
    [commit, notify, t, transactions],
  );

  const rejectSms = useCallback(() => {
    setSheet(null);
    notify(t.confirmSms.rejected);
  }, [notify, t]);

  const value = useMemo<StoreValue>(
    () => ({
      t,
      settings,
      transactions,
      selectedDay,
      sheet,
      toast,
      setLocale: (locale) => updateSettings({ locale }),
      setCurrency: (currency) => updateSettings({ currency }),
      setTheme: (theme) => updateSettings({ theme }),
      setSelectedDay,
      openSheet: setSheet,
      closeSheet: () => setSheet(null),
      notify,
      dismissToast: () => setToast(null),
      saveTransaction,
      deleteTransaction,
      replaceAll,
      receiveSms,
      confirmSms,
      rejectSms,
    }),
    [
      t,
      settings,
      transactions,
      selectedDay,
      sheet,
      toast,
      updateSettings,
      notify,
      saveTransaction,
      deleteTransaction,
      replaceAll,
      receiveSms,
      confirmSms,
      rejectSms,
    ],
  );

  return <StoreContext value={value}>{children}</StoreContext>;
}
