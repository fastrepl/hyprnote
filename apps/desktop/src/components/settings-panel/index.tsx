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
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@hypr/ui/components/ui/tooltip";
import Shortcut from "../shortcut";
import ExtensionsComponent from "./views/extensions";
import { useSettingsPanel } from "@/contexts/settings-panel";

export default function SettingsPanel() {
  const { isOpen, open, close } = useSettingsPanel();
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

  useEffect(() => {
    if (!isOpen) {
      setActive("General");
    }
  }, [isOpen, active]);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={open}
            aria-label="Settings"
            className=" hover:bg-neutral-200 hidden md:block dark:hover:bg-neutral-800 dark:text-neutral-300 dark:hover:text-neutral-100"
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

      <Modal open={isOpen} onClose={close} size="full">
        <ModalBody className="p-0 dark:bg-neutral-600">
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
