import type { Metadata } from "next";
import { Landing } from "@/components/landing/landing";

export const metadata: Metadata = {
  title: "دخل | Dakhl, accounting from your bank SMS",
  description:
    "دخل پیامک بانک را می‌خواند، می‌پرسد برای چه پرداختید و آخر ماه نشان می‌دهد پول کجا رفت. Free, no sign-up, stored only in your browser.",
};

export default function LandingPage() {
  return <Landing />;
}
