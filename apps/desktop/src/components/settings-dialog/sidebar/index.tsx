import { type Template } from "@/types";
import { type NavNames } from "../types";
import { TemplateView } from "./template-view";
import { SettingsView } from "./settings-view";
import { cn } from "@hypr/ui/lib/utils";

interface SettingsSidebarProps {
  active: NavNames | "Profile";
  setActive: (name: NavNames | "Profile") => void;
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
    <aside
      className={cn(
        "flex flex-col",
        "border-r bg-background",
        "w-[52px] min-w-[52px]",
        "h-full md:w-[240px] md:min-w-[240px]",
      )}
      data-collapsed={active !== "Templates"}
    >
      <div
        className={cn(
          "h-full w-full",
          "transition-all duration-300",
          "lg:group-data-[collapsed=true]:w-[52px]",
        )}
      >
        {active === "Templates" ? (
          <TemplateView
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            customTemplates={customTemplates}
            builtinTemplates={builtinTemplates}
            templateIndex={templateIndex}
            onTemplateSelect={onTemplateSelect}
            setActive={setActive}
            selectedTemplate={null}
          />
        ) : (
          <SettingsView active={active} setActive={setActive} />
        )}
      </div>
    </aside>
  );
}
