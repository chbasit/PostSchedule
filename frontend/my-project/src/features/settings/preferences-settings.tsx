"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Monitor, Moon, SlidersHorizontal, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { setTheme, useTheme, type ThemePreference } from "@/components/theme";
import { Select, SelectItem } from "@/components/ui/select";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { api, type User } from "@/lib/api/client";
import { formatDateTime } from "@/lib/time";
import { sessionKey, useWorkspace } from "@/features/session/workspace-context";
import { SettingRow, SettingsSection } from "./settings-ui";

const THEME_ICON = { light: Sun, dark: Moon, system: Monitor } as const;

// Each change saves on its own, like a native settings screen; there is no Save button.
export function PreferencesSettings() {
  const t = useTranslations("settings");
  const tn = useTranslations("nav.settings");
  const tt = useTranslations("theme");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { user } = useWorkspace();
  const theme = useTheme();
  const [timezone, setTimezone] = useState(user.timezone);
  const [use24h, setUse24h] = useState(user.use24h);
  const [sample] = useState(() => new Date());

  const save = useMutation({
    mutationFn: (patch: Partial<Pick<User, "timezone" | "use24h">>) => api.me.update(patch),
    onSuccess: () => {
      toast.success(t("saved"));
      void queryClient.invalidateQueries({ queryKey: sessionKey });
    },
    onError: () => {
      // Put the controls back to what the server has.
      setTimezone(user.timezone);
      setUse24h(user.use24h);
      toast.error(t("saveFailed"));
    },
  });

  const clock = (hour12: boolean) => formatDateTime(sample, locale, timezone, { hour: "numeric", minute: "2-digit", hour12 });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader icon={SlidersHorizontal} tint="violet" title={tn("preferences")} description={t("preferencesBody")} />

      <SettingsSection title={t("appearanceTitle")}>
        <SettingRow id="pref-theme" title={tt("label")} description={t("themeHint")}>
          <Select value={theme} onValueChange={(v) => setTheme(v as ThemePreference)} aria-labelledby="pref-theme" className="w-full">
            {(["light", "dark", "system"] as const).map((v) => {
              const Icon = THEME_ICON[v];
              return (
                <SelectItem key={v} value={v}>
                  <span className="inline-flex items-center gap-2">
                    <Icon className="size-4" aria-hidden /> {tt(v)}
                  </span>
                </SelectItem>
              );
            })}
          </Select>
        </SettingRow>
      </SettingsSection>

      {/* English only (DECISIONS.md 2026-11-11), so there is no language picker. */}
      <SettingsSection title={t("timeTitle")}>
        <SettingRow id="pref-timezone" title={t("timezone")} description={t("timezoneHint")}>
          <TimezoneSelect
            value={timezone}
            aria-labelledby="pref-timezone"
            className="w-full"
            onChange={(zone) => {
              if (zone === timezone) return;
              setTimezone(zone);
              save.mutate({ timezone: zone });
            }}
          />
        </SettingRow>
        <SettingRow id="pref-clock" title={t("clockTitle")} description={t("clockHint")}>
          <Select
            value={use24h ? "24" : "12"}
            aria-labelledby="pref-clock"
            className="w-full"
            onValueChange={(v) => {
              const next = v === "24";
              if (next === use24h) return;
              setUse24h(next);
              save.mutate({ use24h: next });
            }}
          >
            <SelectItem value="12">{t("clock12", { time: clock(true) })}</SelectItem>
            <SelectItem value="24">{t("clock24", { time: clock(false) })}</SelectItem>
          </Select>
        </SettingRow>
      </SettingsSection>
    </div>
  );
}
