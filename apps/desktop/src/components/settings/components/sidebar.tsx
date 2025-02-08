import { type Template } from "@/types/tauri.gen";
import {
  SettingsIcon,
  UserIcon,
  CalendarIcon,
  FileTextIcon,
  CreditCardIcon,
  ChevronLeftIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@hypr/ui/components/ui/sidebar";
import { TemplateList } from "../templates";

const data = {
  nav: [
    { name: "General", icon: SettingsIcon },
    { name: "Profile", icon: UserIcon },
    { name: "Calendar", icon: CalendarIcon },
    { name: "Templates", icon: FileTextIcon },
    { name: "Team & Billing", icon: CreditCardIcon },
  ],
} as const;

export type NavItem = (typeof data.nav)[number];
export type NavNames = NavItem["name"];

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
      <SidebarContent>
        {active === "Templates" ? (
          <>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={false}
                      className="flex flex-row gap-2"
                      onClick={() => setActive(data.nav[0].name)}
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                      <span>Back to Settings</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <TemplateList
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              customTemplates={customTemplates}
              builtinTemplates={builtinTemplates}
              selectedIndex={templateIndex}
              onTemplateSelect={onTemplateSelect}
            />
          </>
        ) : (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {data.nav.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={item.name === active}
                      onClick={() => setActive(item.name)}
                    >
                      <div>
                        <item.icon />
                        <span>{item.name}</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
