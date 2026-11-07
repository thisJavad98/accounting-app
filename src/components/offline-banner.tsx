"use client";

import { useSyncExternalStore } from "react";
import { getOnline, subscribeOnline } from "@/lib/offline";
import { useStore } from "./store";

export function OfflineBanner() {
  const { t } = useStore();
  const online = useSyncExternalStore(subscribeOnline, getOnline, () => true);
  if (online) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-20 border-b border-line bg-sunken/95 px-5 py-2 text-center text-xs font-semibold text-muted backdrop-blur-md"
    >
      {t.offlineBanner}
    </div>
  );
}
