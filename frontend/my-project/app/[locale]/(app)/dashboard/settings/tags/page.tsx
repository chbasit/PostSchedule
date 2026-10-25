import { TagsSettings } from "@/features/settings/tags-settings";
import { AppPage } from "@/features/shell/app-page";

export default function TagsSettingsPage() {
  return (
    <AppPage skeleton="form">
      <TagsSettings />
    </AppPage>
  );
}
