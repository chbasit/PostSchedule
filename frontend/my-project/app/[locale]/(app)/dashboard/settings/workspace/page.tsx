import { WorkspaceSettings } from "@/features/settings/workspace-settings";
import { AppPage } from "@/features/shell/app-page";

export default function WorkspaceSettingsPage() {
  return (
    <AppPage skeleton="form">
      <WorkspaceSettings />
    </AppPage>
  );
}
