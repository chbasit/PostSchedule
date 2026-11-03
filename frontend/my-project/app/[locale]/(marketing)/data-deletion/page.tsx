import { LegalPage } from "@/features/legal/legal-page";
import { legalMetadata } from "@/features/legal/metadata";

export async function generateMetadata() {
  return legalMetadata("dataDeletion");
}

export default function DataDeletionPage() {
  return <LegalPage pageKey="dataDeletion" />;
}
