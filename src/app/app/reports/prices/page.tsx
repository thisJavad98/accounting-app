import type { Metadata } from "next";
import { PricesView } from "@/components/prices-view";

export const metadata: Metadata = { title: "قیمت طلا و دلار | Gold & Dollar Prices" };

export default function PricesPage() {
  return <PricesView />;
}
