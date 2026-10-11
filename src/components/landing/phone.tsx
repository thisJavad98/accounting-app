"use client";

import Image from "next/image";
import type { Locale } from "@/lib/types";

export type Shot = "day" | "month" | "sms";

const WIDTH = 975;
const HEIGHT = 2110;

/** Real app screenshots (public/landing), with a dark variant swapped in by the active theme. */
export function Screenshot({
  locale,
  shot,
  priority,
  sizes = "(min-width: 768px) 340px, 70vw",
  className = "",
}: {
  locale: Locale;
  shot: Shot;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  const alt =
    locale === "fa"
      ? { day: "صفحه روزانه دخل", month: "گزارش ماهانه دخل", sms: "پنجره ثبت پیامک بانک" }[shot]
      : { day: "Dakhl day view", month: "Dakhl monthly report", sms: "Bank SMS entry sheet" }[shot];
  const common = { width: WIDTH, height: HEIGHT, sizes, priority };
  if (shot !== "day") {
    return <Image {...common} alt={alt} src={`/landing/${locale}-light-${shot}.png`} className={`h-auto w-full ${className}`} />;
  }
  return (
    <>
      <Image {...common} alt={alt} src={`/landing/${locale}-light-day.png`} className={`only-light h-auto w-full ${className}`} />
      <Image {...common} alt={alt} src={`/landing/${locale}-dark-day.png`} className={`only-dark h-auto w-full ${className}`} />
    </>
  );
}

export function PhoneFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-[3rem] bg-zinc-900 p-[0.6rem] shadow-[0_40px_80px_-30px_rgb(var(--shadow)/0.45),inset_0_0_0_1px_rgb(255_255_255/0.08)] ${className}`}
    >
      <div className="relative overflow-hidden rounded-[2.5rem] bg-bg">{children}</div>
    </div>
  );
}
