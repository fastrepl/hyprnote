import { type ReactNode } from "react";
import { SearchIcon } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@hypr/ui/components/ui/sidebar";
import type { Template } from "@/types/tauri.gen";

interface TemplateListProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  customTemplates: Template[];
  builtinTemplates: Template[];
  selectedIndex: number;
  onTemplateSelect: (template: Template, index: number) => void;
}

export function TemplateList({
  searchQuery,
  onSearchChange,
  customTemplates,
  builtinTemplates,
  selectedIndex,
  onTemplateSelect,
}: TemplateListProps) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <div className="px-2">
            <div className="relative">
              <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search templates..."
                className="w-full rounded-md border border-input bg-transparent px-8 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>

          {customTemplates && customTemplates.length > 0 && (
            <div className="px-2 py-1">
              <h3 className="mb-2 px-2 text-lg font-semibold">My Templates</h3>
              {customTemplates
                .filter((template) =>
                  template?.title
                    ?.toLowerCase()
                    .includes(searchQuery.toLowerCase()),
                )
                .map((template, index) => (
                  <SidebarMenuItem key={template.id || index}>
                    <SidebarMenuButton
                      isActive={index === selectedIndex}
                      onClick={() => onTemplateSelect(template, index)}
                    >
                      {template.title || "Untitled Template"}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </div>
          )}

          <div className="px-2 py-1">
            <h3 className="mb-2 px-2 text-lg font-semibold">
              Hypernote Templates
            </h3>
            {builtinTemplates
              .filter((template) =>
                template?.title
                  ?.toLowerCase()
                  .includes(searchQuery.toLowerCase()),
              )
              .map((template, index) => (
                <SidebarMenuItem key={template.id || index}>
                  <SidebarMenuButton
                    isActive={false}
                    onClick={() => {}}
                    className="text-muted-foreground"
                  >
                    {template.title || "Untitled Template"}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
          </div>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

interface TemplateContentProps {
  children: ReactNode;
}

export function TemplateContent({ children }: TemplateContentProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
