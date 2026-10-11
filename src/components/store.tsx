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
  | { type: "tx"; id: string | null; sms?: string }
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
  ingestSms: (raw: string) => boolean;
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
    title: "",
    note: "",
    category: parsed.category,
    bank: parsed.bank,
    balance: parsed.balance === null ? null : toCurrency(parsed.balance),
  };
}

/** Reads a bank SMS handed over by the Android share sheet (`?text=`) or an iOS Shortcut (`?sms=`). */
function readIncomingSms(): string | null {
  const params = new URLSearchParams(location.search);
  return params.get("sms") || params.get("text") || null;
}

type InitialState = {
  settings: Settings;
  transactions: Transaction[];
  sheet: Sheet;
  incoming: boolean;
};

function createInitialState(): InitialState {
  const settings = loadSettings();
  const transactions = loadTransactions();
  const raw = readIncomingSms();
  const tx = raw ? smsToTransaction(raw, settings.currency) : null;
  if (raw && tx) {
    return {
      settings,
      transactions: [...transactions, tx],
      sheet: { type: "tx", id: tx.id, sms: raw },
      incoming: true,
    };
  }
  return { settings, transactions, sheet: raw ? { type: "sms" } : null, incoming: !!raw };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  use(browser("Accounting data is stored in browser cookies."));

  const [initial] = useState(createInitialState);
  const [settings, setSettings] = useState(initial.settings);
  const [transactions, setTransactions] = useState(initial.transactions);
  const [selectedDay, setSelectedDay] = useState<DayKey>(todayKey);
  const [sheet, setSheet] = useState<Sheet>(initial.sheet);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastId = useRef(0);

  const t = dictionaries[settings.locale];

  useEffect(() => {
    if (!initial.incoming) return;
    saveTransactions(initial.transactions);
    const url = new URL(location.href);
    url.searchParams.delete("sms");
    url.searchParams.delete("text");
    url.searchParams.delete("title");
    history.replaceState(history.state, "", url.pathname + url.search);
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

  const ingestSms = useCallback(
    (raw: string) => {
      const tx = smsToTransaction(raw, settings.currency);
      if (!tx) return false;
      if (!commit([...transactions, tx])) return true;
      setSelectedDay(dayKey(new Date(tx.at)));
      setSheet({ type: "tx", id: tx.id, sms: raw });
      return true;
    },
    [commit, settings.currency, transactions],
  );

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
      ingestSms,
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
      ingestSms,
    ],
  );

  return <StoreContext value={value}>{children}</StoreContext>;
}
