import type { Metadata } from "next";
import { Suspense } from "react";
import { AppSkeleton } from "@/components/app-skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { Sheets } from "@/components/sheets";
import { StoreProvider } from "@/components/store";
import { ToastViewport } from "@/components/toast";

export const metadata: Metadata = { title: "دخل | Dakhl" };

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
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
  );
}
