import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SettingsIcon } from "lucide-react";
import { cn } from "@hypr/ui/lib/utils";

import { DialogView } from "./views";
import GeneralComponent from "./views/general";
import CalendarComponent from "./views/calendar";
import TagsComponent from "./views/tags";
import TemplateEditor from "./views/template";
import BillingComponent from "./views/billing";
import NotificationsComponent from "./views/notifications";
import TeamComponent from "./views/team";
import ProfileComponent from "./views/profile";
import { SettingsSidebar } from "./sidebar";

import type { NavNames } from "./types";
import { commands, type Template } from "@/types";
import { commands as dbCommands } from "@hypr/plugin-db";

export default function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<NavNames | "Profile">("General");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );

  const templates = useQuery({
    queryKey: ["settings", "templates"],
    queryFn: async () => {
      const [builtin, custom] = await Promise.all([
        commands.listBuiltinTemplates(),
        dbCommands.listTemplates(),
      ]);
      return { builtin: builtin || [], custom: custom || [] };
    },
  });

  const handleUpdateTemplate = (template: Template) => {
    dbCommands.upsertTemplate(template);
    setSelectedTemplate(template);
    templates.refetch();
  };

  const handleCreateTemplate = (template: Template) => {
    dbCommands.upsertTemplate(template);
    templates.refetch();
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setActive("General");
    }
  }, [open, active]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center rounded-md p-1 text-sm font-medium text-neutral-600 ring-offset-background transition-colors duration-200 hover:bg-neutral-200"
        aria-label="Settings"
      >
        <SettingsIcon className="h-4 w-4" />
        <span className="sr-only">Settings</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            className={cn(
              "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
              "h-[calc(100vh-96px)] w-[calc(100vw-96px)]",
              "overflow-clip rounded-lg bg-background shadow-lg",
            )}
          >
            <div className="flex h-full w-full gap-0 overflow-clip p-0">
              <SettingsSidebar
                active={active}
                setActive={setActive}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                customTemplates={templates.data?.custom || []}
                builtinTemplates={templates.data?.builtin || []}
                onTemplateSelect={handleTemplateSelect}
                onCreateTemplate={handleCreateTemplate}
              />

              <DialogView title={active} selectedTemplate={selectedTemplate}>
                {active === "General" && <GeneralComponent />}
                {active === "Calendar" && <CalendarComponent />}
                {active === "Notifications" && <NotificationsComponent />}
                {active === "Templates" && selectedTemplate && (
                  <TemplateEditor
                    disabled={false}
                    template={selectedTemplate}
                    onTemplateUpdate={handleUpdateTemplate}
                    isCreator={
                      // TODO: Replace with actual user ID check
                      selectedTemplate.user_id === "current_user_id"
                    }
                  />
                )}
                {active === "Tags" && <TagsComponent />}
                {active === "Team" && <TeamComponent />}
                {active === "Billing" && <BillingComponent />}
                {active === "Profile" && <ProfileComponent />}
              </DialogView>
            </div>
          </div>
        </>
      )}
    </>
  );
}
