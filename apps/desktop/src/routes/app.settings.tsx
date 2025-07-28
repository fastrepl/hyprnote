import { Trans, useLingui } from "@lingui/react/macro";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLinkIcon } from "lucide-react";
import { useEffect } from "react";
import { z } from "zod";

import { TabIcon } from "@/components/settings/components/tab-icon";
import { type Tab, TABS } from "@/components/settings/components/types";
import {
  Billing,
  Calendar,
  General,
  Integrations,
  LocalAI,
  Notifications,
  Sound,
  TemplatesView,
} from "@/components/settings/views";
import { commands as connectorCommands } from "@hypr/plugin-connector";
import { cn } from "@hypr/ui/lib/utils";

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

function Component() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const search = useSearch({ from: PATH });

  // TODO: this is a hack
  useEffect(() => {
    if (search.baseUrl && search.apiKey) {
      connectorCommands.setCustomLlmConnection({
        api_base: search.baseUrl,
        api_key: search.apiKey,
      }).then(() => {
        connectorCommands.setCustomLlmEnabled(true);
        navigate({ to: PATH, search: { tab: "ai" } });
      });
    }
  }, [search.baseUrl, search.apiKey]);

  const handleClickTab = (tab: Tab) => {
    if (tab === "feedback") {
      openUrl("https://hyprnote.canny.io/feature-requests");
    } else {
      navigate({ to: PATH, search: { ...search, tab } });
    }
  };

  const getTabTitle = (tab: Tab) => {
    switch (tab) {
      case "general":
        return t`General`;
      case "ai":
        return t`AI`;
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
      case "feedback":
        return t`Feedback`;
      case "billing":
        return t`License`;
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

            <div className="flex h-full flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-2">
                <div className="space-y-1">
                  {TABS.map((tab) => (
                    <button
                      key={tab.name}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg p-2 text-sm text-neutral-600 hover:bg-neutral-100",
                        search.tab === tab.name && "bg-neutral-100 font-medium",
                      )}
                      onClick={() => handleClickTab(tab.name)}
                    >
                      <TabIcon tab={tab.name} />
                      {tab.name === "feedback"
                        ? (
                          <div className="flex items-center justify-between flex-1">
                            <Trans>Feedback</Trans>
                            <ExternalLinkIcon className="h-3 w-3" />
                          </div>
                        )
                        : <span>{getTabTitle(tab.name)}</span>}
                    </button>
                  ))}
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
              {search.tab === "ai" && <LocalAI />}
              {search.tab === "templates" && <TemplatesView />}
              {search.tab === "integrations" && <Integrations />}
              {search.tab === "billing" && <Billing />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
