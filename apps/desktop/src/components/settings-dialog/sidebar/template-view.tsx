import { type Template } from "@/types/tauri.gen";
import { ChevronLeftIcon } from "lucide-react";
import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenuButton,
} from "@hypr/ui/components/ui/sidebar";
import { TemplateList } from "../components/template-list";
import { type NavNames } from "../types";
import { data } from "../constants";

export interface TemplateViewProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  customTemplates: Template[];
  builtinTemplates: Template[];
  templateIndex: number;
  onTemplateSelect: (template: Template, index: number) => void;
  setActive: (name: NavNames) => void;
}

export function TemplateView({
  searchQuery,
  onSearchChange,
  customTemplates,
  builtinTemplates,
  templateIndex,
  onTemplateSelect,
  setActive,
}: TemplateViewProps) {
  return (
    <>
      <SidebarHeader className="border-b px-4 py-2">
        <SidebarMenuButton
          isActive={false}
          className="flex flex-row items-center gap-2"
          onClick={() => setActive(data.nav[0].name)}
        >
          <ChevronLeftIcon className="h-4 w-4" />
          <span>Back to Settings</span>
        </SidebarMenuButton>
      </SidebarHeader>

      <SidebarContent>
        <TemplateList
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          customTemplates={customTemplates}
          builtinTemplates={builtinTemplates}
          selectedIndex={templateIndex}
          onTemplateSelect={onTemplateSelect}
        />
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <SidebarMenuButton
          isActive={false}
          className="w-full justify-center"
          onClick={() => {
            /* TODO: Create template handler */
          }}
        >
          Create Template
        </SidebarMenuButton>
      </SidebarFooter>
    </>
  );
}
