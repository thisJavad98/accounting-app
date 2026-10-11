"use client";

import { X } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId } from "react";
import { useStore } from "./store";

export function Sheet({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { t } = useStore();
  const reduce = useReducedMotion();
  const titleId = useId();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <motion.button
        type="button"
        aria-label={t.close}
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/45"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[92dvh] w-full max-w-[440px] flex-col rounded-t-[24px] bg-surface shadow-[0_-20px_60px_-20px_rgb(var(--shadow)/0.35)]"
        initial={reduce ? { opacity: 0 } : { y: "100%" }}
        animate={reduce ? { opacity: 1 } : { y: 0 }}
        exit={reduce ? { opacity: 0 } : { y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
      >
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-line" aria-hidden />
        <header className="flex items-start gap-3 px-5 pt-4 pb-2">
          <div className="flex flex-1 flex-col gap-1">
            <h2 id={titleId} className="text-xl font-bold tracking-tight">
              {title}
            </h2>
            {description && <p className="text-sm leading-relaxed text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="-me-2 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-sunken active:scale-95"
          >
            <X size={20} aria-hidden />
          </button>
        </header>
        <div className="overflow-y-auto px-5 pt-2 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
