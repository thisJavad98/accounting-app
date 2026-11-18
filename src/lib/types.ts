export type Locale = "fa" | "en";
export type Currency = "IRT" | "IRR" | "USD" | "EUR";
/** `transfer` moves money between the user's own accounts and never counts as spending or income. */
export type TxKind = "expense" | "income" | "transfer";

export type BuiltinCategoryId =
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

/** Built-in id, or a user-created id like `c_…`. */
export type CategoryId = BuiltinCategoryId | (string & {});

export type CustomCategory = {
  id: CategoryId;
  name: string;
};

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
  /** Transfers only: the account the money left. */
  fromAccount?: string;
  /** Transfers only: the account the money arrived in. */
  toAccount?: string;
};

export type Theme = "system" | "light" | "dark";

export type Settings = {
  locale: Locale;
  currency: Currency;
  theme: Theme;
  /** Categories the user keeps featured first in pickers. */
  favoriteCategories: CategoryId[];
  /** User-created categories, stored with their display names. */
  customCategories: CustomCategory[];
};
