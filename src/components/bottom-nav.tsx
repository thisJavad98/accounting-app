"use client";

import { CalendarDots, GearSix, PiggyBank, Plus, Vault, type Icon } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { AppLink } from "./app-link";
import { PoweredByCredit } from "./powered-by-footer";
import { useStore } from "./store";

type NavHref = "/app" | "/app/reports/savings" | "/app/reports" | "/app/settings";

function isNavActive(pathname: string, href: NavHref): boolean {
  if (href === "/app") return pathname === "/app";
  if (href === "/app/reports/savings") {
    return (
      pathname === "/app/reports/savings" ||
      pathname.startsWith("/app/reports/savings/") ||
      pathname === "/app/reports/prices" ||
      pathname.startsWith("/app/reports/prices/")
    );
  }
  if (href === "/app/reports") {
    if (
      pathname.startsWith("/app/reports/savings") ||
      pathname.startsWith("/app/reports/prices")
    ) {
      return false;
    }
    return pathname === "/app/reports" || pathname.startsWith("/app/reports/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const { t, openSheet } = useStore();
  const pathname = usePathname();

  const items: { href: NavHref; label: string; icon: Icon }[] = [
    { href: "/app", label: t.nav.day, icon: CalendarDots },
    { href: "/app/reports/savings", label: t.nav.portfolio, icon: Vault },
    { href: "/app/reports", label: t.nav.reports, icon: PiggyBank },
    { href: "/app/settings", label: t.nav.settings, icon: GearSix },
  ];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[440px]">
      <div className="flex justify-end px-5 pb-3">
        <button
          type="button"
          onClick={() => openSheet({ type: "add" })}
          className="pointer-events-auto inline-flex h-14 items-center gap-2 rounded-full bg-brand ps-5 pe-6 text-base font-semibold text-on-brand shadow-[0_10px_30px_-10px_rgb(200_68_15/0.6)] transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]"
        >
          <Plus size={20} weight="bold" aria-hidden />
          {t.nav.add}
        </button>
      </div>
      <div className="pointer-events-auto border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <nav aria-label={t.appName}>
          <ul className="grid grid-cols-4">
            {items.map(({ href, label, icon: Glyph }) => {
              const active = isNavActive(pathname, href);
              return (
                <li key={href}>
                  <AppLink
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                      active ? "text-brand" : "text-muted"
                    }`}
                  >
                    <Glyph size={24} weight={active ? "fill" : "regular"} aria-hidden />
                    {label}
                  </AppLink>
                </li>
              );
            })}
          </ul>
        </nav>
        <PoweredByCredit className="border-t border-line/60 px-3 py-1.5" />
      </div>
    </div>
  );
}
