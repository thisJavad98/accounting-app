"use client";

import { Check, Vault, Warning } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { navigateWithRouter } from "@/lib/offline";
import { useStore } from "./store";

export function ToastViewport() {
  const { toast, dismissToast } = useStore();
  const reduce = useReducedMotion();
  const router = useRouter();

  useEffect(() => {
    if (!toast) return;
    const hold = toast.tone === "error" ? 6000 : toast.tone === "announce" ? 7000 : 2400;
    const timer = setTimeout(dismissToast, hold);
    return () => clearTimeout(timer);
  }, [toast, dismissToast]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 mx-auto flex w-full max-w-[440px] justify-center px-5 pt-[max(env(safe-area-inset-top),1rem)]"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role={toast.href ? "button" : undefined}
            tabIndex={toast.href ? 0 : undefined}
            onClick={() => {
              if (!toast.href) return;
              dismissToast();
              navigateWithRouter(router, toast.href);
            }}
            onKeyDown={(event) => {
              if (!toast.href) return;
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              dismissToast();
              navigateWithRouter(router, toast.href);
            }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={`pointer-events-auto flex items-start gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-bg shadow-lg ${
              toast.href ? "cursor-pointer active:scale-[0.99]" : ""
            }`}
          >
            {toast.tone === "error" ? (
              <Warning size={18} weight="fill" className="mt-0.5 shrink-0 text-brand" aria-hidden />
            ) : toast.tone === "announce" ? (
              <Vault size={18} weight="fill" className="mt-0.5 shrink-0 text-brand" aria-hidden />
            ) : (
              <Check size={18} weight="bold" className="mt-0.5 shrink-0 text-brand" aria-hidden />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
