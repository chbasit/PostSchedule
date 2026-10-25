import { HomeView } from "@/features/home/home-view";
import { AppPage } from "@/features/shell/app-page";

export default function DashboardPage() {
  return (
    <AppPage skeleton="home">
      <HomeView />
    </AppPage>
  );
}
