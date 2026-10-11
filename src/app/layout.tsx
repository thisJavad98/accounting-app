import type { Metadata, Viewport } from "next";
import { Geist, Vazirmatn } from "next/font/google";
import { Suspense } from "react";
import { AppSkeleton } from "@/components/app-skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { ServiceWorker } from "@/components/service-worker";
import { Sheets } from "@/components/sheets";
import { StoreProvider } from "@/components/store";
import { ToastViewport } from "@/components/toast";
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
  title: "دخل و خرج | Dakhl",
  description: "Personal accounting from your bank SMS, stored only in your browser.",
  appleWebApp: { capable: true, title: "Dakhl", statusBarStyle: "default" },
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

/** Applies the saved language before first paint so RTL/LTR never flips visibly. */
const localeScript = `(function(){try{var m=document.cookie.match(/(?:^|; )dk_lang=(en|fa)/);var l=m?m[1]:"fa";var h=document.documentElement;h.lang=l;h.dir=l==="fa"?"rtl":"ltr";}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fa"
      dir="rtl"
      suppressHydrationWarning
      className={`${vazirmatn.variable} ${geist.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: localeScript }} />
      </head>
      <body>
        <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[440px] flex-col bg-bg md:border-x md:border-line">
          <Suspense fallback={<AppSkeleton />}>
            <StoreProvider>
              <main className="flex flex-1 flex-col pb-40">{children}</main>
              <BottomNav />
              <Sheets />
              <ToastViewport />
            </StoreProvider>
          </Suspense>
        </div>
        <ServiceWorker />
      </body>
    </html>
  );
}
