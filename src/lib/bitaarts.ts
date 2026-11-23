import { rialToAppCurrency, type LivePriceItem, type PriceDirection } from "./tgju";
import type { Currency } from "./types";

const BITA_GOLD_CODE = "gold18";

type BitaParam = {
  code?: string;
  value?: number;
  today_change_percentage?: number;
  change_24h?: number;
  last_update?: string;
};

function directionFromPct(changePct: number): PriceDirection {
  if (changePct > 0) return "up";
  if (changePct < 0) return "down";
  return "flat";
}

/** Parse 18k gold (per gram, Rial) from Bitaarts market-parameters payload. */
export function extractBitaGold18(
  payload: unknown,
  currency: Currency,
): LivePriceItem | null {
  if (!payload || typeof payload !== "object") return null;
  const data = (payload as { data?: { base_params?: BitaParam[] } }).data;
  const params = data?.base_params;
  if (!Array.isArray(params)) return null;

  const row = params.find((p) => p?.code === BITA_GOLD_CODE);
  if (!row || typeof row.value !== "number" || !(row.value > 0)) return null;

  const changePctRaw =
    typeof row.today_change_percentage === "number"
      ? row.today_change_percentage
      : typeof row.change_24h === "number"
        ? row.change_24h
        : 0;
  const direction = directionFromPct(changePctRaw);
  const value = rialToAppCurrency(row.value, currency);
  const pctAbs = Math.abs(changePctRaw);
  const changeAbs = Math.abs(Math.round((value * pctAbs) / 100));

  return {
    value,
    change: direction === "down" ? -changeAbs : direction === "up" ? changeAbs : 0,
    changePct: direction === "down" ? -pctAbs : direction === "up" ? pctAbs : 0,
    direction,
    updatedAt: typeof row.last_update === "string" ? row.last_update : null,
  };
}
