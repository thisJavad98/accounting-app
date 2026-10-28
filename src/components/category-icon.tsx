"use client";

import {
  ArrowsLeftRight,
  Bus,
  DotsThreeCircle,
  ForkKnife,
  Heartbeat,
  House,
  Popcorn,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Wallet,
  type Icon,
} from "@phosphor-icons/react";
import { isBuiltinCategory } from "@/lib/categories";
import type { BuiltinCategoryId, CategoryId } from "@/lib/types";

const ICONS: Record<BuiltinCategoryId, Icon> = {
  food: ForkKnife,
  grocery: ShoppingCart,
  transport: Bus,
  shopping: ShoppingBag,
  bills: Receipt,
  health: Heartbeat,
  fun: Popcorn,
  home: House,
  transfer: ArrowsLeftRight,
  salary: Wallet,
  other: DotsThreeCircle,
};

export function CategoryIcon({
  category,
  size = 20,
  className,
}: {
  category: CategoryId;
  size?: number;
  className?: string;
}) {
  const Glyph = isBuiltinCategory(category) ? ICONS[category] : Tag;
  return <Glyph size={size} weight="duotone" className={className} aria-hidden />;
}
