import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import { lockBodyScroll, resetBodyScrollLockForTests, unlockBodyScroll } from "./body-scroll-lock";

describe("body-scroll-lock", () => {
  let scrollTo: ReturnType<typeof mock.fn>;
  let raf: ReturnType<typeof mock.fn>;

  beforeEach(() => {
    resetBodyScrollLockForTests();
    scrollTo = mock.fn();
    raf = mock.fn((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    Object.defineProperty(globalThis, "window", {
      value: { scrollY: 180, scrollTo, requestAnimationFrame: raf },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "document", {
      value: {
        documentElement: { style: {} as CSSStyleDeclaration },
        body: { style: {} as CSSStyleDeclaration },
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    resetBodyScrollLockForTests();
  });

  test("locks body with fixed position and unlocks once", () => {
    lockBodyScroll();
    assert.equal(document.body.style.overflow, "hidden");
    assert.equal(document.body.style.position, "fixed");
    assert.equal(document.body.style.top, "-180px");
    assert.equal(document.documentElement.style.overflow, "hidden");

    unlockBodyScroll();
    assert.equal(document.body.style.overflow, "");
    assert.equal(document.body.style.position, "");
    assert.equal(document.body.style.top, "");
    assert.equal(document.documentElement.style.overflow, "");
    assert.equal(scrollTo.mock.callCount(), 2);
    assert.deepEqual(scrollTo.mock.calls[0]?.arguments, [0, 180]);
  });

  test("overlapping locks do not restore overflow early (AnimatePresence race)", () => {
    lockBodyScroll();
    lockBodyScroll();
    unlockBodyScroll(); // sheet A exits while B still open
    assert.equal(document.body.style.overflow, "hidden");
    assert.equal(document.body.style.position, "fixed");

    unlockBodyScroll(); // sheet B closes
    assert.equal(document.body.style.overflow, "");
    assert.equal(document.body.style.position, "");
  });

  test("extra unlock is a no-op and never re-applies hidden", () => {
    lockBodyScroll();
    lockBodyScroll();
    unlockBodyScroll();
    unlockBodyScroll();
    assert.equal(document.body.style.overflow, "");
    unlockBodyScroll();
    assert.equal(document.body.style.overflow, "");
  });
});
