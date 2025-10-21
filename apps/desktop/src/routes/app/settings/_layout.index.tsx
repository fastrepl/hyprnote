import { createFileRoute } from "@tanstack/react-router";

import { SettingsAI } from "../../../components/settings/ai";
import { SettingsBilling } from "../../../components/settings/billing";
import { SettingsCalendar } from "../../../components/settings/calendar";
import { SettingsDevelopers } from "../../../components/settings/developers";
import { SettingsFeedback } from "../../../components/settings/feedback";
import { SettingsGeneral } from "../../../components/settings/general";
import { SettingsIntegrations } from "../../../components/settings/integrations";
import { SettingsNotifications } from "../../../components/settings/notification";
import { SettingsTemplates } from "../../../components/settings/template";

export const Route = createFileRoute("/app/settings/_layout/")({
  component: Component,
});

function Component() {
  const search = Route.useSearch();

  return (
    <>
      {search.tab === "general" && <SettingsGeneral />}
      {search.tab === "calendar" && <SettingsCalendar />}
      {search.tab === "ai" && <SettingsAI />}
      {search.tab === "notifications" && <SettingsNotifications />}
      {search.tab === "integrations" && <SettingsIntegrations />}
      {search.tab === "templates" && <SettingsTemplates />}
      {search.tab === "feedback" && <SettingsFeedback />}
      {search.tab === "developers" && <SettingsDevelopers />}
      {search.tab === "billing" && <SettingsBilling />}
    </>
  );
}
