import { LegalPage } from "@/features/legal/legal-page";
import { legalMetadata } from "@/features/legal/metadata";

export async function generateMetadata() {
  return legalMetadata("privacy");
}

export default function PrivacyPage() {
  return <LegalPage pageKey="privacy" />;
}
