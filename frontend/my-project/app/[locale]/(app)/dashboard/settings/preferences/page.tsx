import { PreferencesSettings } from "@/features/settings/preferences-settings";
import { AppPage } from "@/features/shell/app-page";

export default function PreferencesSettingsPage() {
  return (
    <AppPage skeleton="form">
      <PreferencesSettings />
    </AppPage>
  );
}
