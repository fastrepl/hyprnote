import { createFileRoute } from "@tanstack/react-router";
import clsx from "clsx";
import { z } from "zod";

import { commands as windowsCommands } from "@hypr/plugin-windows/v1";
import { useAuth } from "../../auth";
import { useValidatedRow } from "../../hooks/useValidatedRow";
import * as persisted from "../../tinybase/store/persisted";

const TABS = ["general", "calendar", "account"] as const;

const validateSearch = z.object({
  tab: z.enum(TABS).default("general"),
});

export const Route = createFileRoute("/app/settings")({
  validateSearch,
  component: Component,
});

function Component() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <div className="flex h-full">
      <div className="w-60 border-r flex flex-col">
        <div data-tauri-drag-region className="h-11" />
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={clsx(
                "flex w-full items-center gap-2 rounded-lg p-2 text-sm text-neutral-600 hover:bg-neutral-100",
                search.tab === tab && "bg-neutral-100 font-medium",
              )}
              onClick={() => navigate({ search: { tab } })}
            >
              <span className="capitalize">{tab}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex h-full w-full flex-col overflow-hidden">
        <header
          data-tauri-drag-region
          className="h-11 w-full flex items-center justify-between border-b px-2"
        >
          <div className="w-40"></div>
          <h1 data-tauri-drag-region className="text-md font-semibold capitalize">{search.tab}</h1>
          <div className="w-40"></div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 w-full">
          {search.tab === "general" && <SettingsGeneral />}
          {search.tab === "calendar" && <SettingsCalendar />}
          {search.tab === "account" && <SettingsAccount />}
        </div>
      </div>
    </div>
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

function SettingsAccount() {
  const s = useAuth();

  const handleAuth = () => windowsCommands.windowShow({ type: "auth" });

  return (
    <div>
      <pre>{JSON.stringify(s?.session)}</pre>
      <button onClick={handleAuth}>Auth</button>
    </div>
  );
}
