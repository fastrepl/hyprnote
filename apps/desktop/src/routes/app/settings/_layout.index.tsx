import { createFileRoute } from "@tanstack/react-router";

import { SettingsAccount } from "../../../components/settings/account";
import { LLM } from "../../../components/settings/ai/llm";
import { STT } from "../../../components/settings/ai/stt";
import { SettingsCalendar } from "../../../components/settings/calendar";
import { SettingsGeneral } from "../../../components/settings/general";
import { SettingsIntegrations } from "../../../components/settings/integrations";
import { SettingsMemory } from "../../../components/settings/memory";
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
      {search.tab === "transcription" && <STT />}
      {search.tab === "intelligence" && <LLM />}
      {search.tab === "memory" && <SettingsMemory />}
      {search.tab === "notifications" && <SettingsNotifications />}
      {search.tab === "integrations" && <SettingsIntegrations />}
      {search.tab === "templates" && <SettingsTemplates />}
      {search.tab === "account" && <SettingsAccount />}
    </>
  );
}
