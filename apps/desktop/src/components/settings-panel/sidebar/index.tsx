import { type NavNames } from "../types";
import { TemplateView } from "./template-view";
import { SettingsView } from "./settings-view";
import { ExtensionsView } from "./extensions-view";
import { cn } from "@hypr/ui/lib/utils";
import { type Template } from "@hypr/plugin-db";

interface SettingsSidebarProps {
  active: NavNames | "Profile";
  setActive: (name: NavNames | "Profile") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  customTemplates: Template[];
  builtinTemplates: Template[];
  onTemplateSelect: (template: Template) => void;
  onCreateTemplate: (template: Template) => void;
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
}: SettingsSidebarProps) {
  return (
    <aside
      className={cn(
        "flex flex-col",
        "border-r bg-background dark:bg-neutral-600 dark:border-neutral-500",
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
            onTemplateSelect={onTemplateSelect}
            onCreateTemplate={onCreateTemplate}
            setActive={setActive}
            selectedTemplate={null}
          />
        ) : active === "Extensions" ? (
          <ExtensionsView
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            setActive={setActive}
          />
        ) : (
          <SettingsView active={active} setActive={setActive} />
        )}
      </div>
    </aside>
  );
}
