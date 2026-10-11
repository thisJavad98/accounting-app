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
};

export type Settings = {
  locale: Locale;
  currency: Currency;
};
