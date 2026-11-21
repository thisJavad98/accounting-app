import type { Metadata } from "next";
import { PortfolioView } from "@/components/portfolio-view";

export const metadata: Metadata = { title: "پس‌انداز | Savings" };

export default function SavingsPage() {
  return <PortfolioView />;
}
