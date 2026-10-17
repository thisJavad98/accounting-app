export type Locale = "fa" | "en";
export type Currency = "IRT" | "IRR" | "USD" | "EUR";
export type TxKind = "expense" | "income";

export type CategoryId =
  | "food"
  | "grocery"
  | "transport"
  | "shopping"
  | "bills"
  | "health"
  | "fun"
  | "home"
  | "transfer"
  | "salary"
  | "other";

export type Transaction = {
  id: string;
  kind: TxKind;
  amount: number;
  /** epoch milliseconds */
  at: number;
  title: string;
  note: string;
  category: CategoryId;
  bank: string;
  /** Account balance reported by the bank SMS, if any. */
  balance: number | null;
  /** Marked by the user in the month-end report as an unnecessary buy to cut/save. */
  unnecessary?: boolean;
};

export type Theme = "system" | "light" | "dark";

export type Settings = {
  locale: Locale;
  currency: Currency;
  theme: Theme;
};
