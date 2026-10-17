import type { Metadata } from "next";
import { ReportDetailView } from "@/components/report-detail-view";

export const metadata: Metadata = { title: "جزئیات گزارش ماهانه | Monthly Report Detail" };

export default async function ReportDetailPage({ params }: PageProps<"/app/reports/[month]">) {
  const { month } = await params;
  return <ReportDetailView monthParam={month} />;
}
