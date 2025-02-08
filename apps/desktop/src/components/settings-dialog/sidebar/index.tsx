import { type Template } from "@/types/tauri.gen";
import { Sidebar } from "@hypr/ui/components/ui/sidebar";
import { type NavNames } from "../types";
import { TemplateView } from "./template-view";
import { SettingsView } from "./settings-view";

interface SettingsSidebarProps {
  active: NavNames;
  setActive: (name: NavNames) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  customTemplates: Template[];
  builtinTemplates: Template[];
  templateIndex: number;
  onTemplateSelect: (template: Template, index: number) => void;
}

export function SettingsSidebar({
  active,
  setActive,
  searchQuery,
  onSearchChange,
  customTemplates,
  builtinTemplates,
  templateIndex,
  onTemplateSelect,
}: SettingsSidebarProps) {
  return (
    <Sidebar collapsible="none" className="hidden md:flex">
      {active === "Templates" ? (
        <TemplateView
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          customTemplates={customTemplates}
          builtinTemplates={builtinTemplates}
          templateIndex={templateIndex}
          onTemplateSelect={onTemplateSelect}
          setActive={setActive}
        />
      ) : (
        <SettingsView active={active} setActive={setActive} />
      )}
    </Sidebar>
  );
}
