import { Trans, useLingui } from "@lingui/react/macro";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { TabIcon } from "@/components/settings/components/tab-icon";
import { type Tab, TABS } from "@/components/settings/components/types";
import {
  Calendar,
  Feedback,
  General,
  Lab,
  LocalAI,
  Notifications,
  Sound,
  TemplatesView,
} from "@/components/settings/views";
import { cn } from "@hypr/ui/lib/utils";

const schema = z.object({
  tab: z.enum(TABS.map(t => t.name) as [Tab, ...Tab[]]).default("general"),
});

const PATH = "/app/settings";
export const Route = createFileRoute(PATH)({
  validateSearch: zodValidator(schema),
  component: Component,
});

function Component() {
  const navigate = useNavigate();
  const search = useSearch({ from: PATH });
  const { t } = useLingui();

  const handleClickTab = (tab: Tab) => {
    navigate({ to: PATH, search: { ...search, tab } });
  };

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case "general":
        return t`General`;
      case "profile":
        return t`Profile`;
      case "ai":
        return t`AI`;
      case "calendar":
        return t`Calendar`;
      case "notifications":
        return t`Notifications`;
      case "templates":
        return t`Templates`;
      case "extensions":
        return t`Extensions`;
      case "team":
        return t`Team`;
      case "billing":
        return t`Billing`;
      case "lab":
        return t`Lab`;
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
                      <span>
                        {tab.name === "general"
                          ? <Trans>General</Trans>
                          : tab.name === "calendar"
                          ? <Trans>Calendar</Trans>
                          : tab.name === "notifications"
                          ? <Trans>Notifications</Trans>
                          : tab.name === "sound"
                          ? <Trans>Sound</Trans>
                          : tab.name === "ai"
                          ? <Trans>AI</Trans>
                          : tab.name === "lab"
                          ? <Trans>Lab</Trans>
                          : tab.name === "feedback"
                          ? <Trans>Feedback</Trans>
                          : tab.name === "templates"
                          ? <Trans>Templates</Trans>
                          : null}
                      </span>
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
              {search.tab === "lab" && <Lab />}
              {search.tab === "feedback" && <Feedback />}
              {search.tab === "templates" && <TemplatesView />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
