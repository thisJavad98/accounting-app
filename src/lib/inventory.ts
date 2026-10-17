import { parseBankSmsBatch } from "./sms-parser";
import type { Currency, Transaction, TxKind } from "./types";

export type BankInventoryItem = {
  id: string;
  bankKey: string;
  bank: string;
  title: string;
  balance: number;
  amount: number;
  kind: TxKind;
  at: number;
};

export type BankInventorySummary = {
  /** Deduplicated bank inventories — only the latest SMS inventory per bank is kept. */
  items: BankInventoryItem[];
  /** Sum of latest inventories across all distinct banks. */
  total: number;
  count: number;
};

export function normalizeBankKey(bank: string, fallbackId: string): string {
  const cleaned = bank
    .trim()
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/^(بانک|bank)\s+/i, "")
    .replace(/\s+(بانک|bank)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || `unknown-${fallbackId}`;
}

/**
 * Extracts all bank SMS transactions that carry a detected balance (inventory),
 * deduplicates by bank so that duplicate banks only keep their latest SMS inventory,
 * and sums the latest inventory of each bank into `total`.
 */
export function computeBankInventories(transactions: Transaction[]): BankInventorySummary {
  const withBalance = [...transactions]
    .filter(
      (tx): tx is Transaction & { balance: number } =>
        typeof tx.balance === "number" && Number.isFinite(tx.balance),
    )
    // Sort newest first; if timestamps match, later item in array wins
    .reverse()
    .sort((a, b) => b.at - a.at);

  const byBank = new Map<string, BankInventoryItem>();
  for (const tx of withBalance) {
    const bankKey = normalizeBankKey(tx.bank || tx.title, tx.id);
    if (byBank.has(bankKey)) continue;
    byBank.set(bankKey, {
      id: tx.id,
      bankKey,
      bank: tx.bank.trim(),
      title: tx.title.trim(),
      balance: tx.balance,
      amount: tx.amount,
      kind: tx.kind,
      at: tx.at,
    });
  }

  const items = [...byBank.values()];
  const total = items.reduce((sum, item) => sum + item.balance, 0);

  return {
    items,
    total,
    count: items.length,
  };
}

export type SmsInventoryPreviewItem = {
  bankKey: string;
  bank: string;
  title: string;
  amount: number;
  balance: number;
  kind: TxKind;
  at: number | null;
};

export type SmsInventoryPreview = {
  items: SmsInventoryPreviewItem[];
  rawCount: number;
  totalInventory: number;
};

/**
 * Live-detects inventory (balance) from one or multiple bank SMS messages in raw text.
 * If the same bank appears multiple times, keeps the last/latest SMS inventory for that bank.
 */
export function detectSmsInventoryPreview(raw: string, currency: Currency): SmsInventoryPreview {
  if (!raw.trim()) return { items: [], rawCount: 0, totalInventory: 0 };
  const batch = parseBankSmsBatch(raw);
  const rawWithBalance: SmsInventoryPreviewItem[] = [];

  batch.forEach(({ parsed }, idx) => {
    if (parsed.balance === null) return;
    const toCur = (v: number) => (currency === "IRT" && parsed.inRial ? Math.round(v / 10) : v);
    const bank = parsed.bank.trim();
    const title = (parsed.suggestedTitle || parsed.bank).trim();
    const bankKey = normalizeBankKey(bank || title, String(idx));
    rawWithBalance.push({
      bankKey,
      bank,
      title,
      amount: toCur(parsed.amount),
      balance: toCur(parsed.balance),
      kind: parsed.kind,
      at: parsed.at,
    });
  });

  // Deduplicate by bankKey: if timestamps are stated, newest timestamp wins; otherwise the last SMS in text wins.
  const byBank = new Map<string, SmsInventoryPreviewItem>();
  for (const item of rawWithBalance) {
    const prev = byBank.get(item.bankKey);
    if (!prev) {
      byBank.set(item.bankKey, item);
      continue;
    }
    if (item.at !== null && prev.at !== null) {
      if (item.at >= prev.at) byBank.set(item.bankKey, item);
    } else {
      byBank.set(item.bankKey, item);
    }
  }

  const items = [...byBank.values()];
  const totalInventory = items.reduce((sum, item) => sum + item.balance, 0);

  return {
    items,
    rawCount: rawWithBalance.length,
    totalInventory,
  };
}
