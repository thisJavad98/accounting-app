import type { Metadata, Viewport } from "next";
import { Geist, Vazirmatn } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic", "latin"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  // Without this, Persian glyphs fall back to the Arial-based metric shim instead of Vazirmatn.
  adjustFontFallback: false,
  fallback: [],
});

export const metadata: Metadata = {
  title: "دخل | Dakhl, accounting from your bank SMS",
  description: "Personal accounting from your bank SMS, stored only in your browser.",
  applicationName: "دخل | Dakhl",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/192", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "دخل", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#111113" },
  ],
};

/** Applies the saved language and theme before first paint so direction and colors never flip visibly. */
const bootScript = `(function(){try{var c=document.cookie,h=document.documentElement;var m=c.match(/(?:^|; )dk_lang=(en|fa)/);var l=m?m[1]:"fa";h.lang=l;h.dir=l==="fa"?"rtl":"ltr";var t=c.match(/(?:^|; )dk_theme=(light|dark)/);if(t)h.dataset.theme=t[1];}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fa"
      dir="rtl"
      suppressHydrationWarning
      className={`${vazirmatn.variable} ${geist.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
