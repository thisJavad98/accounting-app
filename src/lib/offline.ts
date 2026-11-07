/** Shared list of routes kept warm for offline use (mirrors public/sw.js SHELL app paths). */
export const OFFLINE_SHELL = [
  "/app",
  "/app/month",
  "/app/reports",
  "/app/settings",
  "/app/settings/categories",
  "/app/settings/sms-ios",
] as const;

const onlineListeners = new Set<() => void>();
const swListeners = new Set<() => void>();

function emit(listeners: Set<() => void>) {
  listeners.forEach((listener) => listener());
}

let onlineWired = false;
let swWired = false;

function ensureOnlineWired() {
  if (onlineWired || typeof window === "undefined") return;
  onlineWired = true;
  const notify = () => emit(onlineListeners);
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
}

function ensureSwWired() {
  if (swWired || typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  swWired = true;
  const notify = () => emit(swListeners);
  navigator.serviceWorker.addEventListener("controllerchange", notify);
  void navigator.serviceWorker.ready.then(notify);
}

export function subscribeOnline(listener: () => void) {
  ensureOnlineWired();
  onlineListeners.add(listener);
  return () => onlineListeners.delete(listener);
}

export function getOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function subscribeServiceWorkerReady(listener: () => void) {
  ensureSwWired();
  swListeners.add(listener);
  return () => swListeners.delete(listener);
}

/** True when a service worker is controlling this page (offline shell can be served). */
export function getServiceWorkerReady(): boolean {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  return !!navigator.serviceWorker.controller;
}

/** Best-effort warm of app HTML shells so offline nav works after first online visit. */
export function warmOfflineShell() {
  for (const path of OFFLINE_SHELL) {
    void fetch(path, { credentials: "same-origin", cache: "reload" }).catch(() => {});
  }
}

/**
 * Soft-navigate online; full document load offline so the service worker can
 * serve cached HTML instead of a failed RSC request.
 */
export function navigateWithRouter(
  router: { push: (href: string) => void; replace: (href: string) => void },
  href: string,
  mode: "push" | "replace" = "push",
) {
  if (!getOnline()) {
    if (mode === "replace") window.location.replace(href);
    else window.location.assign(href);
    return;
  }
  if (mode === "replace") router.replace(href);
  else router.push(href);
}
