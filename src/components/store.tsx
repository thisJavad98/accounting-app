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
import { dictionaries, type Dictionary } from "@/lib/i18n";
import { intakeSms, readIncomingSms, stripIncomingSms } from "@/lib/sms-intake";
import type { Currency, Locale, Settings, Theme, Transaction } from "@/lib/types";

export type Sheet =
  | { type: "add" }
  | { type: "sms"; text?: string }
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
  const base = { settings, transactions, incoming: !!raw, raw };
  if (!raw) return { ...base, sheet: null, notice: null };

  const result = intakeSms(raw, settings.currency, transactions);
  switch (result.status) {
    case "ready":
      return { ...base, sheet: { type: "confirm", tx: result.tx, sms: raw }, notice: null };
    case "unreadable":
      return { ...base, sheet: { type: "sms" }, notice: null };
    default:
      return { ...base, sheet: null, notice: result.status };
  }
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
      const result = intakeSms(raw, settings.currency, transactions);
      switch (result.status) {
        case "unreadable":
          return false;
        case "old":
          setSheet(null);
          notify(t.confirmSms.old);
          break;
        case "duplicate":
          setSelectedDay(dayKey(new Date(result.tx.at)));
          setSheet(null);
          notify(t.confirmSms.duplicate);
          break;
        default:
          setSheet({ type: "confirm", tx: result.tx, sms: raw });
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
