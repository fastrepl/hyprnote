import { commands as windowsCommands } from "@hypr/plugin-windows/v1";
import { createFileRoute } from "@tanstack/react-router";

import { useAuth } from "../../../auth";
import { useValidatedRow } from "../../../hooks/useValidatedRow";
import * as persisted from "../../../store/tinybase/persisted";

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

function SettingsGeneral() {
  const res = persisted.useConfig();
  if (!res) {
    return null;
  }
  const { id, config } = res;

  const parsedConfig = persisted.configSchema.parse(config);

  const handleUpdate = persisted.UI.useSetRowCallback(
    "configs",
    id,
    (row: persisted.Config) => ({
      ...row,
      spoken_languages: JSON.stringify(row.spoken_languages),
      jargons: JSON.stringify(row.jargons),
      notification_ignored_platforms: row.notification_ignored_platforms
        ? JSON.stringify(row.notification_ignored_platforms)
        : undefined,
    }),
    [id],
    persisted.STORE_ID,
  );

  const r = useValidatedRow(persisted.configSchema, parsedConfig, handleUpdate);

  return (
    <div>
      <pre>{JSON.stringify(config, null, 2)}</pre>
      <input
        type="checkbox"
        onChange={(e) => r.setField("save_recordings", e.target.checked)}
      />
    </div>
  );
}

function SettingsCalendar() {
  return null;
}

function SettingsAI() {
  return null;
}

function SettingsNotifications() {
  return null;
}

function SettingsIntegrations() {
  return null;
}

function SettingsTemplates() {
  return null;
}

function SettingsFeedback() {
  return null;
}

function SettingsDevelopers() {
  const s = useAuth();

  const handleAuth = () => windowsCommands.windowShow({ type: "auth" });

  return (
    <div>
      <pre>{JSON.stringify(s?.session)}</pre>
      <button onClick={handleAuth}>Auth</button>
    </div>
  );
}

function SettingsBilling() {
  return null;
}
