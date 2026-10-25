"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { API_URL, GOOGLE_AUTH } from "@/config/site";
import { usingMockApi } from "@/lib/api/client";
import { safeNextPath } from "@/lib/utils";
import { GoogleIcon } from "./google-icon";

// Google sign-in plus the "or" divider. With the real backend it only shows once the
// Google provider is set up; the mock keeps it visible to show the layout.
export function GoogleSignIn() {
  const t = useTranslations("auth");
  const [leaving, setLeaving] = useState(false);
  if (!usingMockApi && !GOOGLE_AUTH) return null;
  return (
    <>
      <Button
        variant="secondary"
        size="lg"
        className="w-full"
        loading={leaving}
        onClick={() => {
          if (usingMockApi) {
            toast.info(t("googleUnavailable"));
            return;
          }
          // A full-page visit: the server sets the sign-in cookies and sends the person to Google.
          const start = new URL("/api/v1/auth/google", API_URL);
          const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
          if (next) start.searchParams.set("next", next);
          setLeaving(true);
          window.location.assign(start.href);
        }}
      >
        <GoogleIcon /> {t("google")}
      </Button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t("or")}
        <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}
