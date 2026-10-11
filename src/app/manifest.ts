import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "دخل | Dakhl",
    short_name: "دخل",
    description: "حسابداری شخصی از روی پیامک بانک، فقط در مرورگر شما. Personal accounting from your bank SMS.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    dir: "rtl",
    lang: "fa",
    categories: ["finance", "productivity", "utilities"],
    background_color: "#fafafa",
    theme_color: "#c8440f",
    prefer_related_applications: false,
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    screenshots: [
      { src: "/landing/fa-light-day.png", sizes: "975x2110", type: "image/png", form_factor: "narrow", label: "خرج‌های روزانه" },
      { src: "/landing/fa-light-sms.png", sizes: "975x2110", type: "image/png", form_factor: "narrow", label: "ثبت پیامک بانک" },
      { src: "/landing/fa-light-month.png", sizes: "975x2110", type: "image/png", form_factor: "narrow", label: "گزارش ماهانه" },
    ],
    shortcuts: [
      { name: "امروز", short_name: "امروز", url: "/app", icons: [{ src: "/icons/192", sizes: "192x192" }] },
      { name: "گزارش ماه", short_name: "ماه", url: "/app/month", icons: [{ src: "/icons/192", sizes: "192x192" }] },
      { name: "تنظیمات", short_name: "تنظیمات", url: "/app/settings", icons: [{ src: "/icons/192", sizes: "192x192" }] },
    ],
    share_target: {
      action: "/app",
      method: "GET",
      enctype: "application/x-www-form-urlencoded",
      params: { title: "title", text: "text" },
    },
  };
}
