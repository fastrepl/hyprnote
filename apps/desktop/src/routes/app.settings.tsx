import { useLingui } from "@lingui/react/macro";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { TabIcon } from "@/components/settings/components/tab-icon";
import { type Tab, TABS } from "@/components/settings/components/types";
import {
  AILLM,
  AISTT,
  Billing,
  Calendar,
  General,
  HelpSupport,
  Integrations,
  MCP,
  Notifications,
  Sound,
  TemplatesView,
} from "@/components/settings/views";
import { useHypr } from "@/contexts";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { cn } from "@hypr/ui/lib/utils";
import { useEffect } from "react";

const schema = z.object({
  tab: z.enum(TABS.map(t => t.name) as [Tab, ...Tab[]]).default("general"),
  // TODO: not ideal. should match deeplink.rs
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
});

const PATH = "/app/settings";
export const Route = createFileRoute(PATH)({
  validateSearch: zodValidator(schema),
  component: Component,
});

function TabButton({ tab, isActive, onClick }: { tab: Tab; isActive: boolean; onClick: () => void }) {
  const { t } = useLingui();

  const getTabTitle = (tab: Tab) => {
    switch (tab) {
      case "general":
        return t`General`;
      case "ai-llm":
        return t`Intelligence`;
      case "ai-stt":
        return t`Transcription`;
      case "calendar":
        return t`Calendar`;
      case "notifications":
        return t`Notifications`;
      case "templates":
        return t`Templates`;
      case "sound":
        return t`Sound`;
      case "integrations":
        return t`Integrations`;
      case "billing":
        return t`Billing & License`;
      case "mcp":
        return t`MCP`;
      case "help-support":
        return t`Help & Support`;
      default:
        return tab;
    }
  };

  return (
    <div key={tab}>
      <button
        className={cn(
          "flex w-full items-center gap-2 rounded-lg p-2 text-sm text-neutral-600 hover:bg-neutral-100",
          isActive && "bg-neutral-100 font-medium",
        )}
        onClick={onClick}
      >
        <TabIcon tab={tab} />
        <span>{getTabTitle(tab)}</span>
      </button>
    </div>
  );
}

function Component() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const search = useSearch({ from: PATH });
  const { userId } = useHypr();

  useEffect(() => {
    if (userId) {
      const eventMap = {
        "general": "show_settings_window_general",
        "ai-llm": "show_settings_window_intelligence",
        "ai-stt": "show_settings_window_transcription",
      };

      const event = eventMap[search.tab as keyof typeof eventMap];
      if (event) {
        analyticsCommands.event({
          event,
          distinct_id: userId,
        });
      }
    }
  }, [search.tab, userId]);

  const handleClickTab = (tab: Tab) => {
    navigate({ to: PATH, search: { ...search, tab } });
  };

  const getTabTitle = (tab: Tab) => {
    switch (tab) {
      case "general":
        return t`General`;
      case "ai-llm":
        return t`Intelligence`;
      case "ai-stt":
        return t`Transcription`;
      case "calendar":
        return t`Calendar`;
      case "notifications":
        return t`Notifications`;
      case "templates":
        return t`Templates`;
      case "sound":
        return t`Sound`;
      case "integrations":
        return t`Integrations`;
      case "billing":
        return t`Billing & License`;
      case "mcp":
        return t`MCP`;
      case "help-support":
        return t`Help & Support`;
      default:
        return tab;
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1">
        {/* Sidebar */}
        <div className="flex h-full">
          <div className="w-60 border-r">
            <div
              data-tauri-drag-region
              className="flex items-center h-11 justify-end px-2"
            />

            <div className="flex h-[calc(100%-2.75rem)] flex-col">
              <div className="flex-1 overflow-y-auto p-2 min-h-0">
                <div className="space-y-1">
                  {TABS.filter(tab => tab.name !== "help-support" && tab.name !== "billing").map((tab) => (
                    <TabButton
                      key={tab.name}
                      tab={tab.name}
                      isActive={search.tab === tab.name}
                      onClick={() => handleClickTab(tab.name)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex-shrink-0 p-2 border-t border-neutral-200">
                <div className="space-y-1">
                  <TabButton
                    tab="billing"
                    isActive={search.tab === "billing"}
                    onClick={() => handleClickTab("billing")}
                  />
                  <TabButton
                    tab="help-support"
                    isActive={search.tab === "help-support"}
                    onClick={() => handleClickTab("help-support")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex h-full w-full flex-col overflow-hidden">
            {/* Header */}
            <header data-tauri-drag-region className="h-11 w-full flex items-center justify-between border-b px-2">
              <div className="w-40" data-tauri-drag-region></div>

              <h1 className="text-md font-semibold capitalize" data-tauri-drag-region>
                {getTabTitle(search.tab)}
              </h1>

              <div className="w-40" data-tauri-drag-region></div>
            </header>

            {/* Actual Content */}
            <div className="flex-1 overflow-y-auto p-6 w-full">
              {search.tab === "general" && <General />}
              {search.tab === "calendar" && <Calendar />}
              {search.tab === "notifications" && <Notifications />}
              {search.tab === "sound" && <Sound />}
              {search.tab === "ai-stt" && <AISTT />}
              {search.tab === "ai-llm" && <AILLM />}
              {search.tab === "templates" && <TemplatesView />}
              {search.tab === "integrations" && <Integrations />}
              {search.tab === "mcp" && <MCP />}
              {search.tab === "billing" && <Billing />}
              {search.tab === "help-support" && <HelpSupport />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
