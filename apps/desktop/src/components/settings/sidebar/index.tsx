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
      className={`flex flex-col border-r bg-background ${
        active !== "Templates" && active !== "Extensions"
          ? "w-[52px] min-w-[52px] md:w-[240px] md:min-w-[240px]"
          : "w-0 min-w-0 md:w-[240px] md:min-w-[240px]"
      } h-full`}
    >
      <div className="h-full w-full transition-all duration-300">
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
