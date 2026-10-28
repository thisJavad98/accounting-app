import type { Metadata } from "next";
import { CategoriesSettingsView } from "@/components/categories-settings-view";

export const metadata: Metadata = { title: "دسته‌ها | Categories" };

export default function CategoriesSettingsPage() {
  return <CategoriesSettingsView />;
}
