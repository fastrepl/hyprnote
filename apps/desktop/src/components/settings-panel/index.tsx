import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SettingsIcon } from "lucide-react";
import { Button } from "@hypr/ui/components/ui/button";
import { Modal, ModalBody } from "@hypr/ui/components/ui/modal";
import { SettingsPanelBody } from "./views";
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
import { commands as dbCommands, type Template } from "@hypr/plugin-db";
import { useHotkeys } from "react-hotkeys-hook";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@hypr/ui/components/ui/tooltip";
import Shortcut from "../shortcut";
import ExtensionsComponent from "./views/extensions";

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<NavNames | "Profile">("General");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );

  const templates = useQuery({
    queryKey: ["settings", "templates"],
    queryFn: async () => {
      const [custom] = await Promise.all([dbCommands.listTemplates()]);
      return { builtin: [], custom: custom || [] };
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

  useHotkeys(
    "mod+,",
    (event) => {
      event.preventDefault();
      setOpen((prev) => !prev);
    },
    { enableOnFormTags: true },
  );

  useEffect(() => {
    if (!open) {
      setActive("General");
    }
  }, [open, active]);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-neutral-200 hidden sm:block"
            onClick={() => setOpen(true)}
            aria-label="Settings"
          >
            <SettingsIcon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            Open settings panel{" "}
            <Shortcut macDisplay="⌘," windowsDisplay="Ctrl+," />
          </p>
        </TooltipContent>
      </Tooltip>

      <Modal open={open} onClose={() => setOpen(false)} size="full">
        <ModalBody className="p-0">
          <div className="flex h-full w-full gap-0 overflow-clip">
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

            <SettingsPanelBody
              title={active}
              selectedTemplate={selectedTemplate}
            >
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
              {active === "Extensions" && !selectedTemplate && (
                <ExtensionsComponent />
              )}
              {active === "Tags" && <TagsComponent />}
              {active === "Team" && <TeamComponent />}
              {active === "Billing" && <BillingComponent />}
              {active === "Profile" && <ProfileComponent />}
            </SettingsPanelBody>
          </div>
        </ModalBody>
      </Modal>
    </>
  );
}
