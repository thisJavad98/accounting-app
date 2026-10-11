"use client";

import { formatNumber } from "@/lib/format";
import { useStore } from "./store";

export function Money({
  value,
  sign,
  className = "",
  unitClassName = "text-[0.6em] font-medium text-muted",
}: {
  value: number;
  sign?: "+" | "-";
  className?: string;
  unitClassName?: string;
}) {
  const { settings, t } = useStore();
  return (
    <span className={`inline-flex items-baseline gap-1 tabular-nums ${className}`}>
      <bdi>
        {sign === "+" ? "+" : sign === "-" ? "\u2212" : ""}
        {formatNumber(value, settings.locale)}
      </bdi>
      <span className={unitClassName}>{t.currencies[settings.currency]}</span>
    </span>
  );
}
