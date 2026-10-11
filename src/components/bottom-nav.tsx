"use client";

import { CalendarDots, ChartDonut, GearSix, Plus, type Icon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "./store";

export function BottomNav() {
  const { t, openSheet } = useStore();
  const pathname = usePathname();

  const items: { href: "/app" | "/app/month" | "/app/settings"; label: string; icon: Icon }[] = [
    { href: "/app", label: t.nav.day, icon: CalendarDots },
    { href: "/app/month", label: t.nav.month, icon: ChartDonut },
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
      <nav
        aria-label={t.appName}
        className="pointer-events-auto border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
      >
        <ul className="grid grid-cols-3">
          {items.map(({ href, label, icon: Glyph }) => {
            const active = pathname === href || (href !== "/app" && pathname.startsWith(`${href}/`));
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                    active ? "text-brand" : "text-muted"
                  }`}
                >
                  <Glyph size={24} weight={active ? "fill" : "regular"} aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
