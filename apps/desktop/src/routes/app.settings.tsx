import { Button } from "@hypr/ui/components/ui/button";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { clsx } from "clsx";
import { CalendarDaysIcon, CreditCardIcon, FileIcon, SettingsIcon, UsersIcon } from "lucide-react";
import { z } from "zod";

const TABS = ["general", "calendar", "extensions", "templates", "team", "billing"] as const;

type Tab = typeof TABS[number];

const schema = z.object({
  current: z.enum(TABS).default("general"),
});

const PATH = "/app/settings";
export const Route = createFileRoute(PATH)({
  validateSearch: zodValidator(schema),
  component: Component,
});

function Component() {
  const { current } = useSearch({ from: PATH });
  const navigate = useNavigate();

  const handleClickTab = (tab: Tab) => {
    navigate({ to: PATH, search: { current: tab } });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden flex-col bg-white text-neutral-700">
      <header className="flex w-full flex-col">
        <div data-tauri-drag-region className="relative h-8 w-full flex items-center justify-center">
          <h1 className="text-md font-semibold" data-tauri-drag-region>
            Settings
          </h1>
        </div>
      </header>

      <div className="flex-1 h-full">
        {TABS.map((tab) => (
          <Button
            key={tab}
            variant="ghost"
            onClick={() => handleClickTab(tab)}
            className={clsx(
              "flex items-center gap-2",
              current === tab && "bg-accent text-accent-foreground",
            )}
          >
            {tab === "general"
              ? <SettingsIcon className="size-4" />
              : tab === "calendar"
              ? <CalendarDaysIcon className="size-4" />
              : tab === "extensions"
              ? <FileIcon className="size-4" />
              : tab === "templates"
              ? <FileIcon className="size-4" />
              : tab === "team"
              ? <UsersIcon className="size-4" />
              : tab === "billing"
              ? <CreditCardIcon className="size-4" />
              : null}
            <span className="text-lg font-medium">{tab}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
