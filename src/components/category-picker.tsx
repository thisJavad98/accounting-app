"use client";

import { Plus } from "@phosphor-icons/react";
import { useMemo } from "react";
import { categoryLabel, orderedCategories } from "@/lib/categories";
import type { CategoryId } from "@/lib/types";
import { CategoryIcon } from "./category-icon";
import { useStore } from "./store";
import { chipClass } from "./ui";

export function CategoryPicker({
  value,
  onChange,
  onCreateNew,
}: {
  value: CategoryId;
  onChange: (category: CategoryId) => void;
  onCreateNew?: () => void;
}) {
  const { t, settings } = useStore();
  const customs = settings.customCategories;
  const favorites = settings.favoriteCategories;
  const categories = useMemo(
    () => orderedCategories(favorites, customs),
    [customs, favorites],
  );
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  const favoriteOnes = categories.filter((id) => favoriteSet.has(id));
  const rest = categories.filter((id) => !favoriteSet.has(id));

  function Chip({ id }: { id: CategoryId }) {
    return (
      <button
        type="button"
        aria-pressed={value === id}
        onClick={() => onChange(id)}
        className={chipClass(value === id)}
      >
        <CategoryIcon category={id} size={18} />
        {categoryLabel(id, t.categories, customs)}
      </button>
    );
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-sm font-semibold">{t.form.category}</legend>
      {favoriteOnes.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            {t.form.favoriteCategories}
          </p>
          <div className="flex flex-wrap gap-2">
            {favoriteOnes.map((id) => (
              <Chip key={id} id={id} />
            ))}
          </div>
        </div>
      )}
      {rest.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {rest.map((id) => (
            <Chip key={id} id={id} />
          ))}
        </div>
      )}
      {onCreateNew && (
        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-full border border-dashed border-line bg-surface px-4 text-sm font-semibold text-brand-ink active:scale-[0.98]"
        >
          <Plus size={16} weight="bold" aria-hidden />
          {t.form.createCategory}
        </button>
      )}
    </fieldset>
  );
}
