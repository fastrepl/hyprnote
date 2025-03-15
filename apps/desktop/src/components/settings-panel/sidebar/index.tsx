import { type NavNames } from "../types";
import { ExtensionsView } from "./extensions-view";
import { SettingsView } from "./settings-view";
import { TemplateView } from "./template-view";

import { type ExtensionDefinition, type Template } from "@hypr/plugin-db";

interface SettingsSidebarProps {
  active: NavNames | "Profile";
  setActive: (name: NavNames | "Profile") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  customTemplates: Template[];
  builtinTemplates: Template[];
  onTemplateSelect: (template: Template) => void;
  onCreateTemplate: (template: Template) => void;
  selectedExtension: ExtensionDefinition | null;
  onExtensionSelect: (extension: ExtensionDefinition | null) => void;
}

export function SettingsSidebar({
  active,
  setActive,
  searchQuery,
  onSearchChange,
  customTemplates,
  builtinTemplates,
  onTemplateSelect,
  onCreateTemplate,
  selectedExtension,
  onExtensionSelect,
}: SettingsSidebarProps) {
  return (
    <aside
      className="flex flex-col border-r bg-background w-[52px] min-w-[52px] h-full md:w-[240px] md:min-w-[240px]"
      data-collapsed={active !== "Templates"}
    >
      <div className="h-full w-full transition-all duration-300 lg:group-data-[collapsed=true]:w-[52px]">
        {active === "Templates"
          ? (
            <TemplateView
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              customTemplates={customTemplates}
              builtinTemplates={builtinTemplates}
              onTemplateSelect={onTemplateSelect}
              onCreateTemplate={onCreateTemplate}
              setActive={setActive}
              selectedTemplate={null}
            />
          )
          : active === "Extensions"
          ? (
            <ExtensionsView
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              setActive={setActive}
              selectedExtension={selectedExtension}
              onExtensionSelect={onExtensionSelect}
            />
          )
          : <SettingsView active={active} setActive={setActive} />}
      </div>
    </aside>
  );
}
