import type { Metadata } from "next";
import { MonthView } from "@/components/month-view";

export const metadata: Metadata = { title: "ماهانه | Month" };

export default function MonthPage() {
  return <MonthView />;
}
