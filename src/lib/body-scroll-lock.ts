/**
 * Ref-counted body scroll lock for iOS standalone / Safari.
 *
 * Per-instance `overflow: hidden` + restore-previous races when Sheets swap
 * under AnimatePresence (exit still mounted while enter locks). Restoring the
 * previous string then leaves `overflow: hidden` stuck and the PWA cannot scroll.
 *
 * `position: fixed` + saved scrollY is the reliable iOS pattern; a counter keeps
 * overlapping mounts/unmounts from unlocking early or restoring a bad value.
 */

let locks = 0;
let scrollY = 0;

export function lockBodyScroll() {
  if (typeof document === "undefined") return;
  locks += 1;
  if (locks !== 1) return;

  scrollY = window.scrollY;
  const { body, documentElement } = document;
  documentElement.style.overflow = "hidden";
  body.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
}

export function unlockBodyScroll() {
  if (typeof document === "undefined") return;
  locks = Math.max(0, locks - 1);
  if (locks !== 0) return;

  const { body, documentElement } = document;
  documentElement.style.overflow = "";
  body.style.overflow = "";
  body.style.position = "";
  body.style.top = "";
  body.style.left = "";
  body.style.right = "";
  body.style.width = "";
  const y = scrollY;
  window.scrollTo(0, y);
  // iOS sometimes applies the unlock before layout settles; re-assert next frame.
  window.requestAnimationFrame(() => window.scrollTo(0, y));
}

/** Test / recovery helper — not used in UI paths. */
export function resetBodyScrollLockForTests() {
  locks = 0;
  scrollY = 0;
}
