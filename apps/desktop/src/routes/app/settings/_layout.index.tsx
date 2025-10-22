import { createFileRoute } from "@tanstack/react-router";

import { SettingsAI } from "../../../components/settings/ai";
import { SettingsBilling } from "../../../components/settings/billing";
import { SettingsCalendar } from "../../../components/settings/calendar";
import { SettingsGeneral } from "../../../components/settings/general";
import { SettingsIntegrations } from "../../../components/settings/integrations";
import { SettingsNotifications } from "../../../components/settings/notification";
import { SettingsTemplates } from "../../../components/settings/template";

export const Route = createFileRoute("/app/settings/_layout/")({
  component: Component,
});

function Component() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <>
      {search.tab === "general" && <SettingsGeneral />}
      {search.tab === "calendar" && <SettingsCalendar />}
      {search.tab === "ai" && <SettingsAI />}
      {search.tab === "notifications" && <SettingsNotifications />}
      {search.tab === "integrations" && <SettingsIntegrations />}
      {search.tab === "templates" && <SettingsTemplates navigate={navigate} />}
      {search.tab === "billing" && <SettingsBilling />}
    </>
  );
}
