import { ProfileSettings } from "@/features/settings/profile-settings";
import { AppPage } from "@/features/shell/app-page";

export default function ProfileSettingsPage() {
  return (
    <AppPage skeleton="form">
      <ProfileSettings />
    </AppPage>
  );
}
