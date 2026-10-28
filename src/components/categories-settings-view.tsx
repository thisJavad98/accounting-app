"use client";

import { CaretLeft, Plus, Star, Trash } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  categoryLabel,
  DEFAULT_FAVORITE_CATEGORIES,
  isCustomCategoryId,
  orderedCategories,
} from "@/lib/categories";
import type { CategoryId } from "@/lib/types";
import { CategoryIcon } from "./category-icon";
import { useStore } from "./store";
import { inputClass, primaryButton, secondaryButton } from "./ui";

function CategoryRow({
  category,
  favorited,
  onToggle,
  addLabel,
  removeLabel,
  name,
  onDelete,
  deleteLabel,
  deleteConfirm,
}: {
  category: CategoryId;
  favorited: boolean;
  onToggle: () => void;
  addLabel: string;
  removeLabel: string;
  name: string;
  onDelete?: () => void;
  deleteLabel?: string;
  deleteConfirm?: string;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex items-center gap-2 rounded-2xl bg-sunken px-3 py-2.5">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={favorited}
        aria-label={favorited ? removeLabel : addLabel}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-start active:scale-[0.99]"
      >
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-brand-ink">
          <CategoryIcon category={category} size={22} />
        </span>
        <span className="min-w-0 flex-1 font-semibold">{name}</span>
        <Star
          size={22}
          weight={favorited ? "fill" : "regular"}
          className={favorited ? "shrink-0 text-brand" : "shrink-0 text-faint"}
          aria-hidden
        />
      </button>
      {onDelete && deleteLabel && (
        <button
          type="button"
          onClick={() => {
            if (!confirmDelete) {
              setConfirmDelete(true);
              return;
            }
            onDelete();
            setConfirmDelete(false);
          }}
          aria-label={deleteLabel}
          title={confirmDelete ? deleteConfirm : deleteLabel}
          className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full ${
            confirmDelete ? "bg-danger/15 text-danger" : "text-muted"
          }`}
        >
          <Trash size={18} aria-hidden />
        </button>
      )}
    </div>
  );
}

export function CategoriesSettingsView() {
  const {
    t,
    settings,
    transactions,
    toggleFavoriteCategory,
    setFavoriteCategories,
    addCustomCategory,
    deleteCustomCategory,
    notify,
    categoryReturn,
    finishCategoryReturn,
    cancelCategoryReturn,
  } = useStore();
  const router = useRouter();
  const fromTx = !!categoryReturn;
  const copy = t.categorySettings;
  const customs = settings.customCategories;
  const favorites = settings.favoriteCategories;
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!fromTx) return;
    nameRef.current?.focus();
    nameRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [fromTx]);

  const labelOf = (id: CategoryId) => categoryLabel(id, t.categories, customs);

  function goBackToTx() {
    const restored = cancelCategoryReturn();
    router.replace(restored?.returnPath ?? "/app");
  }

  const popular = useMemo(() => {
    const counts = new Map<CategoryId, number>();
    for (const tx of transactions) {
      counts.set(tx.category, (counts.get(tx.category) ?? 0) + 1);
    }
    const catalog = orderedCategories(favorites, customs);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || catalog.indexOf(a[0]) - catalog.indexOf(b[0]))
      .map(([id]) => id)
      .filter((id) => !favoriteSet.has(id))
      .slice(0, 4);
  }, [customs, favoriteSet, favorites, transactions]);

  const rest = orderedCategories(favorites, customs).filter(
    (id) => !favoriteSet.has(id) && !isCustomCategoryId(id),
  );

  function resetDefaults() {
    setFavoriteCategories([...DEFAULT_FAVORITE_CATEGORIES]);
    notify(copy.resetDone);
  }

  function createCategory(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    const id = addCustomCategory(name);
    if (!id) {
      setNameError(true);
      return;
    }
    setName("");
    setNameError(false);
    notify(copy.createDone);
    if (categoryReturn) {
      const restored = finishCategoryReturn(id);
      router.replace(restored?.returnPath ?? "/app");
    }
  }

  return (
    <div className="flex flex-col gap-8 px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-10">
      <div className="flex flex-col gap-4">
        {categoryReturn ? (
          <button
            type="button"
            onClick={goBackToTx}
            className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted"
          >
            <CaretLeft size={16} weight="bold" className="rtl:rotate-180" aria-hidden />
            {t.form.newTx}
          </button>
        ) : (
          <Link
            href="/app/settings"
            className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted"
          >
            <CaretLeft size={16} weight="bold" className="rtl:rotate-180" aria-hidden />
            {copy.back}
          </Link>
        )}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-black tracking-tight">{copy.title}</h1>
          <p className="text-sm leading-relaxed text-muted">{copy.intro}</p>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-bold">{copy.createTitle}</h2>
        <form onSubmit={createCategory} className="flex flex-col gap-3">
          <input
            ref={nameRef}
            value={name}
            maxLength={40}
            placeholder={copy.createPlaceholder}
            aria-invalid={nameError}
            onChange={(event) => {
              setName(event.target.value);
              setNameError(false);
            }}
            className={inputClass}
          />
          {nameError && <p className="text-sm font-medium text-danger">{copy.createError}</p>}
          <button type="submit" className={`${primaryButton} h-12 text-sm`}>
            <Plus size={18} weight="bold" aria-hidden />
            {copy.createAction}
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-bold">{copy.custom}</h2>
        {customs.length === 0 ? (
          <p className="rounded-2xl bg-sunken px-4 py-3 text-sm leading-relaxed text-muted">
            {copy.customEmpty}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {customs.map((item) => (
              <CategoryRow
                key={item.id}
                category={item.id}
                favorited={favoriteSet.has(item.id)}
                name={item.name}
                addLabel={copy.addFavorite}
                removeLabel={copy.removeFavorite}
                deleteLabel={copy.deleteCustom}
                deleteConfirm={copy.deleteConfirm}
                onToggle={() => {
                  toggleFavoriteCategory(item.id);
                  notify(copy.saved);
                }}
                onDelete={() => {
                  if (deleteCustomCategory(item.id)) notify(copy.deleted);
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-bold">{copy.favorites}</h2>
        {favorites.length === 0 ? (
          <p className="rounded-2xl bg-sunken px-4 py-3 text-sm leading-relaxed text-muted">
            {copy.favoritesEmpty}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {favorites.map((category) => (
              <CategoryRow
                key={category}
                category={category}
                favorited
                name={labelOf(category)}
                addLabel={copy.addFavorite}
                removeLabel={copy.removeFavorite}
                onToggle={() => {
                  toggleFavoriteCategory(category);
                  notify(copy.saved);
                }}
              />
            ))}
          </div>
        )}
        <button type="button" onClick={resetDefaults} className={`${secondaryButton} h-11 text-sm`}>
          {copy.reset}
        </button>
      </section>

      {popular.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="font-bold">{copy.popular}</h2>
            <p className="text-sm text-muted">{copy.popularHint}</p>
          </div>
          <div className="flex flex-col gap-2">
            {popular.map((category) => (
              <CategoryRow
                key={category}
                category={category}
                favorited={false}
                name={labelOf(category)}
                addLabel={copy.addFavorite}
                removeLabel={copy.removeFavorite}
                onToggle={() => {
                  toggleFavoriteCategory(category);
                  notify(copy.saved);
                }}
              />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-bold">{copy.all}</h2>
        <div className="flex flex-col gap-2">
          {rest.map((category) => (
            <CategoryRow
              key={category}
              category={category}
              favorited={false}
              name={labelOf(category)}
              addLabel={copy.addFavorite}
              removeLabel={copy.removeFavorite}
              onToggle={() => {
                toggleFavoriteCategory(category);
                notify(copy.saved);
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
