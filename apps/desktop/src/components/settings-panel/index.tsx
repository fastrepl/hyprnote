import { useQuery } from "@tanstack/react-query";

import { SettingsIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { SettingsSidebar } from "./sidebar";
import type { NavNames } from "./types";
import { SettingsPanelBody } from "./views";
import BillingComponent from "./views/billing";
import CalendarComponent from "./views/calendar";
import ExtensionsComponent from "./views/extensions";
import GeneralComponent from "./views/general";
import NotificationsComponent from "./views/notifications";
import ProfileComponent from "./views/profile";
import TeamComponent from "./views/team";
import TemplateEditor from "./views/template";

import { useSettingsPanel } from "@/contexts";
import { commands as dbCommands, type ExtensionDefinition, type Template } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";
import { Modal, ModalBody } from "@hypr/ui/components/ui/modal";

export default function SettingsPanel() {
  const { isOpen, open, close } = useSettingsPanel();
  const [active, setActive] = useState<NavNames | "Profile">("General");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );
  const [selectedExtension, setSelectedExtension] = useState<ExtensionDefinition | null>(null);

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

  // Reset selected extension when changing away from Extensions view
  useEffect(() => {
    if (active !== "Extensions") {
      setSelectedExtension(null);
    }
  }, [active]);

  return (
    <>
      <Button
        onClick={open}
        aria-label="Settings"
        variant="ghost"
        className="w-full justify-start flex hover:bg-neutral-200"
      >
        <SettingsIcon className="mr-2 h-4 w-4" />
        Settings
      </Button>

      <Modal open={isOpen} onClose={close} size="full">
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
              selectedExtension={selectedExtension}
              onExtensionSelect={setSelectedExtension}
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
              {active === "Extensions" && (
                <ExtensionsComponent selectedExtension={selectedExtension} onExtensionSelect={setSelectedExtension} />
              )}
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
