import { LegalPage } from "@/features/legal/legal-page";
import { legalMetadata } from "@/features/legal/metadata";

export async function generateMetadata() {
  return legalMetadata("terms");
}

export default function TermsPage() {
  return <LegalPage pageKey="terms" />;
}
