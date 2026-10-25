import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppPage } from "@/features/shell/app-page";
import { CalendarView } from "@/features/calendar/calendar-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav.items");
  return { title: t("calendar") };
}

export default function CalendarPage() {
  return (
    <AppPage skeleton="calendar">
      <CalendarView />
    </AppPage>
  );
}
