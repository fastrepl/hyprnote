import { Trans } from "@lingui/react/macro";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";

import { MainSidebar, SettingsHeader, type Tab, TABS } from "@/components/settings/components";
import { Calendar, Feedback, General, Lab, LocalAI, Notifications, Sound } from "@/components/settings/views";
import { Button } from "@hypr/ui/components/ui/button";

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

  const handleClickTab = (tab: Tab) => {
    navigate({ to: PATH, search: { ...search, tab } });
  };

  return (
    <div className="relative flex h-screen w-screen overflow-hidden">
      <div className="flex h-full w-full flex-col overflow-hidden bg-background">
        <div className="flex h-full">
          <div className="w-60 border-r">
            <div
              data-tauri-drag-region
              className="flex items-center h-11 justify-end px-2"
            >
              {(search.tab === "extensions") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-neutral-200 text-neutral-600 hover:text-neutral-600"
                  onClick={() => handleClickTab("general")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>
                    <Trans>Back to Settings</Trans>
                  </span>
                </Button>
              )}
            </div>

            <MainSidebar current={search.tab} onTabClick={handleClickTab} />
          </div>

          <div className="flex-1 flex h-full w-full flex-col overflow-hidden">
            <SettingsHeader
              current={search.tab}
            />
            <div className="flex-1 overflow-y-auto p-6">
              {search.tab === "general" && <General />}
              {search.tab === "calendar" && <Calendar />}
              {search.tab === "notifications" && <Notifications />}
              {search.tab === "sound" && <Sound />}
              {search.tab === "ai" && <LocalAI />}
              {search.tab === "lab" && <Lab />}
              {search.tab === "feedback" && <Feedback />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
