import type { BuiltinCategoryId, CategoryId, CustomCategory } from "./types";

export const CATEGORY_IDS: BuiltinCategoryId[] = [
  "food",
  "grocery",
  "transport",
  "shopping",
  "bills",
  "health",
  "fun",
  "home",
  "transfer",
  "salary",
  "other",
];

/** Defaults most people use day to day — shown first until the user customizes. */
export const DEFAULT_FAVORITE_CATEGORIES: CategoryId[] = [
  "food",
  "grocery",
  "transport",
  "shopping",
  "bills",
  "other",
];

export function isBuiltinCategory(id: string): id is BuiltinCategoryId {
  return (CATEGORY_IDS as string[]).includes(id);
}

export function isCustomCategoryId(id: string): boolean {
  return id.startsWith("c_");
}

export function isKnownCategory(id: string, customs: CustomCategory[]): boolean {
  return isBuiltinCategory(id) || customs.some((item) => item.id === id);
}

export function newCustomCategoryId(): CategoryId {
  return `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function allCategoryIds(customs: CustomCategory[]): CategoryId[] {
  return [...CATEGORY_IDS, ...customs.map((item) => item.id)];
}

export function categoryLabel(
  id: CategoryId,
  builtinLabels: Record<BuiltinCategoryId, string>,
  customs: CustomCategory[],
): string {
  if (isBuiltinCategory(id)) return builtinLabels[id];
  return customs.find((item) => item.id === id)?.name ?? id;
}

/** Parse a saved favorites cookie value. Missing/`null` falls back to defaults; `""` means none. */
export function parseFavoriteCategories(
  raw: string | undefined | null,
  customs: CustomCategory[] = [],
): CategoryId[] {
  if (raw == null) return [...DEFAULT_FAVORITE_CATEGORIES];
  if (raw === "") return [];
  const known = new Set(allCategoryIds(customs));
  const seen = new Set<string>();
  const result: CategoryId[] = [];
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (!id || !known.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

export function serializeFavoriteCategories(
  favorites: CategoryId[],
  customs: CustomCategory[] = [],
): string {
  return parseFavoriteCategories(favorites.join(",") || "", customs).join(",");
}

/** Favorites first (in saved order), then builtins, then custom ones. */
export function orderedCategories(
  favorites: CategoryId[],
  customs: CustomCategory[] = [],
): CategoryId[] {
  const fav = parseFavoriteCategories(favorites.join(",") || "", customs);
  const favSet = new Set(fav);
  return [...fav, ...allCategoryIds(customs).filter((id) => !favSet.has(id))];
}

/** Compact cookie form: `id=Name&id=Name` (URI-encoded names). */
export function serializeCustomCategories(customs: CustomCategory[]): string {
  return customs
    .filter((item) => isCustomCategoryId(item.id) && item.name.trim())
    .map((item) => `${item.id}=${encodeURIComponent(item.name.trim().slice(0, 40))}`)
    .join("&");
}

export function parseCustomCategories(raw: string | undefined | null): CustomCategory[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const result: CustomCategory[] = [];
  for (const part of raw.split("&")) {
    if (!part) continue;
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const id = part.slice(0, eq);
    if (!isCustomCategoryId(id) || seen.has(id)) continue;
    let name = "";
    try {
      name = decodeURIComponent(part.slice(eq + 1)).trim();
    } catch {
      name = part.slice(eq + 1).trim();
    }
    if (!name) continue;
    seen.add(id);
    result.push({ id, name: name.slice(0, 40) });
  }
  return result;
}
