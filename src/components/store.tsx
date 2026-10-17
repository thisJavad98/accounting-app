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
import { intakeSms, needsClipboardHandover, readIncomingSms, stripIncomingSms } from "@/lib/sms-intake";
import type { CategoryId, Currency, Locale, Settings, Theme, Transaction, TxKind } from "@/lib/types";

export type Sheet =
  | { type: "add" }
  | { type: "sms"; text?: string }
  | { type: "paste" }
  | { type: "calendar" }
  | { type: "tx"; id: string | null; sms?: string; kind?: TxKind; category?: CategoryId }
  | { type: "confirm"; tx: Transaction; sms: string; old?: boolean }
  | null;

type Toast = { id: number; message: string; tone: "neutral" | "error" };

/** How long the app must have been in the background before it asks about the clipboard again. */
const AWAY_BEFORE_ASKING = 20_000;

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
  saveTransactionsBatch: (txs: Transaction[], message?: string) => boolean;
  deleteTransaction: (id: string) => void;
  deleteTransactions: (ids: string[], message?: string) => void;
  toggleUnnecessary: (ids: string[], unnecessary?: boolean) => void;
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
  notice: "duplicate" | null;
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
    case "old":
      return {
        ...base,
        sheet: { type: "confirm", tx: result.tx, sms: raw, old: result.status === "old" },
        notice: null,
      };
    case "unreadable":
      return { ...base, sheet: { type: "sms" }, notice: null };
    default:
      return { ...base, sheet: null, notice: "duplicate" };
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

  const saveTransactionsBatch = useCallback(
    (txs: Transaction[], message?: string) => {
      if (txs.length === 0) return false;
      const byId = new Map(transactions.map((item) => [item.id, item]));
      for (const tx of txs) {
        byId.set(tx.id, tx);
      }
      const next = [...byId.values()];
      if (commit(next)) {
        notify(message ?? t.toast.saved);
        return true;
      }
      return false;
    },
    [commit, notify, t, transactions],
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      if (commit(transactions.filter((item) => item.id !== id))) notify(t.toast.deleted);
    },
    [commit, notify, t, transactions],
  );

  const deleteTransactions = useCallback(
    (ids: string[], message?: string) => {
      const idSet = new Set(ids);
      const next = transactions.filter((item) => !idSet.has(item.id));
      if (next.length === 0) {
        clearTransactions();
        setTransactions([]);
        notify(message ?? t.toast.deleted);
        return;
      }
      if (commit(next)) notify(message ?? t.toast.deleted);
    },
    [commit, notify, t, transactions],
  );

  const toggleUnnecessary = useCallback(
    (ids: string[], unnecessary?: boolean) => {
      const idSet = new Set(ids);
      const next = transactions.map((item) => {
        if (!idSet.has(item.id)) return item;
        const nextVal = unnecessary ?? !item.unnecessary;
        return { ...item, unnecessary: nextVal || undefined };
      });
      commit(next);
    },
    [commit, transactions],
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
        case "duplicate":
          setSelectedDay(dayKey(new Date(result.tx.at)));
          setSheet(null);
          notify(t.confirmSms.duplicate);
          break;
        default:
          setSheet({ type: "confirm", tx: result.tx, sms: raw, old: result.status === "old" });
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

  // On iOS the Shortcut's link arrives stripped of its query, so the message is only on the clipboard,
  // which a page may not read on its own. The app therefore asks on the way in, once per visit.
  useEffect(() => {
    if (!needsClipboardHandover()) return;
    let leftAt = 0;
    const ask = () => setSheet((open) => open ?? { type: "paste" });
    const onVisibility = () => {
      if (document.visibilityState === "hidden") leftAt = Date.now();
      else if (Date.now() - leftAt > AWAY_BEFORE_ASKING) ask();
    };
    document.addEventListener("visibilitychange", onVisibility);
    ask();
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

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
      saveTransactionsBatch,
      deleteTransaction,
      deleteTransactions,
      toggleUnnecessary,
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
      saveTransactionsBatch,
      deleteTransaction,
      deleteTransactions,
      toggleUnnecessary,
      replaceAll,
      receiveSms,
      confirmSms,
      rejectSms,
    ],
  );

  return <StoreContext value={value}>{children}</StoreContext>;
}
