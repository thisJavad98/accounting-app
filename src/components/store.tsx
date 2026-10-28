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
import {
  isCustomCategoryId,
  newCustomCategoryId,
  parseFavoriteCategories,
} from "@/lib/categories";
import type {
  CategoryId,
  Currency,
  CustomCategory,
  Locale,
  Settings,
  Theme,
  Transaction,
  TxKind,
} from "@/lib/types";

export type TxSheetDraft = {
  kind: TxKind;
  amountText: string;
  title: string;
  note: string;
  unnecessary: boolean;
};

export type Sheet =
  | { type: "add" }
  | { type: "sms"; text?: string }
  | { type: "paste" }
  | { type: "calendar" }
  | {
      type: "tx";
      id: string | null;
      sms?: string;
      kind?: TxKind;
      category?: CategoryId;
      draft?: TxSheetDraft;
    }
  | { type: "confirm"; tx: Transaction; sms: string; old?: boolean }
  | null;

/** Saved when leaving the expense/income sheet to create a category. */
export type CategoryReturn = {
  returnPath: string;
  sheet: Extract<Sheet, { type: "tx" }>;
};

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
  categoryReturn: CategoryReturn | null;
  beginCategoryReturn: (value: CategoryReturn) => void;
  finishCategoryReturn: (category: CategoryId) => CategoryReturn | null;
  cancelCategoryReturn: () => CategoryReturn | null;
  setLocale: (locale: Locale) => void;
  setCurrency: (currency: Currency) => void;
  setTheme: (theme: Theme) => void;
  setFavoriteCategories: (favorites: CategoryId[]) => void;
  toggleFavoriteCategory: (category: CategoryId) => void;
  addCustomCategory: (name: string) => CategoryId | null;
  renameCustomCategory: (id: CategoryId, name: string) => boolean;
  deleteCustomCategory: (id: CategoryId) => boolean;
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
  const [categoryReturn, setCategoryReturn] = useState<CategoryReturn | null>(null);
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

  const beginCategoryReturn = useCallback((value: CategoryReturn) => {
    setCategoryReturn(value);
    setSheet(null);
  }, []);

  const finishCategoryReturn = useCallback(
    (category: CategoryId) => {
      if (!categoryReturn) return null;
      const restored = categoryReturn;
      setCategoryReturn(null);
      setSheet({
        ...restored.sheet,
        category,
        kind: restored.sheet.draft?.kind ?? restored.sheet.kind,
      });
      return restored;
    },
    [categoryReturn],
  );

  const cancelCategoryReturn = useCallback(() => {
    if (!categoryReturn) return null;
    const restored = categoryReturn;
    setCategoryReturn(null);
    setSheet(restored.sheet);
    return restored;
  }, [categoryReturn]);

  const value = useMemo<StoreValue>(
    () => ({
      t,
      settings,
      transactions,
      selectedDay,
      sheet,
      toast,
      categoryReturn,
      beginCategoryReturn,
      finishCategoryReturn,
      cancelCategoryReturn,
      setLocale: (locale) => updateSettings({ locale }),
      setCurrency: (currency) => updateSettings({ currency }),
      setTheme: (theme) => updateSettings({ theme }),
      setFavoriteCategories: (favorites) =>
        updateSettings({
          favoriteCategories: parseFavoriteCategories(
            favorites.join(",") || "",
            settings.customCategories,
          ),
        }),
      toggleFavoriteCategory: (category) => {
        const current = settings.favoriteCategories;
        const next = current.includes(category)
          ? current.filter((id) => id !== category)
          : [...current, category];
        updateSettings({
          favoriteCategories: parseFavoriteCategories(
            next.join(",") || "",
            settings.customCategories,
          ),
        });
      },
      addCustomCategory: (name) => {
        const trimmed = name.trim().slice(0, 40);
        if (!trimmed) return null;
        const duplicate = settings.customCategories.some(
          (item) => item.name.localeCompare(trimmed, undefined, { sensitivity: "accent" }) === 0,
        );
        if (duplicate) return null;
        const id = newCustomCategoryId();
        const customCategories: CustomCategory[] = [
          ...settings.customCategories,
          { id, name: trimmed },
        ];
        updateSettings({
          customCategories,
          favoriteCategories: parseFavoriteCategories(
            [...settings.favoriteCategories, id].join(","),
            customCategories,
          ),
        });
        return id;
      },
      renameCustomCategory: (id, name) => {
        if (!isCustomCategoryId(id)) return false;
        const trimmed = name.trim().slice(0, 40);
        if (!trimmed) return false;
        const customCategories = settings.customCategories.map((item) =>
          item.id === id ? { ...item, name: trimmed } : item,
        );
        if (!customCategories.some((item) => item.id === id)) return false;
        updateSettings({ customCategories });
        return true;
      },
      deleteCustomCategory: (id) => {
        if (!isCustomCategoryId(id)) return false;
        if (!settings.customCategories.some((item) => item.id === id)) return false;
        const customCategories = settings.customCategories.filter((item) => item.id !== id);
        const favoriteCategories = parseFavoriteCategories(
          settings.favoriteCategories.filter((item) => item !== id).join(",") || "",
          customCategories,
        );
        const nextTxs = transactions.map((tx) =>
          tx.category === id ? { ...tx, category: "other" as CategoryId } : tx,
        );
        updateSettings({ customCategories, favoriteCategories });
        if (nextTxs.some((tx, index) => tx.category !== transactions[index]?.category)) {
          commit(nextTxs);
        }
        return true;
      },
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
      categoryReturn,
      beginCategoryReturn,
      finishCategoryReturn,
      cancelCategoryReturn,
      updateSettings,
      commit,
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
