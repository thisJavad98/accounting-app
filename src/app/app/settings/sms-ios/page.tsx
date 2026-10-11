import type { Metadata } from "next";
import { SmsIosGuide } from "@/components/sms-ios-guide";

export const metadata: Metadata = { title: "اتصال پیامک در آیفون | iPhone SMS setup" };

export default function SmsIosGuidePage() {
  return <SmsIosGuide />;
}
