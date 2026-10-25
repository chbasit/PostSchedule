import { TeamsView } from "@/features/teams/teams-view";
import { AppPage } from "@/features/shell/app-page";

export default function TeamSettingsPage() {
  return (
    <AppPage skeleton="list">
      <TeamsView />
    </AppPage>
  );
}
