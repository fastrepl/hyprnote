import { UserIcon } from "lucide-react";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@hypr/ui/components/ui/sidebar";
import { type NavNames } from "../types";
import { data } from "../constants";

export interface SettingsViewProps {
  active: NavNames;
  setActive: (name: NavNames) => void;
}

export function SettingsView({ active, setActive }: SettingsViewProps) {
  return (
    <>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.nav.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    isActive={item.name === active}
                    onClick={() => setActive(item.name)}
                  >
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <SidebarMenuButton
          isActive={active === "Profile"}
          onClick={() => setActive("Profile")}
        >
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            <span>Profile</span>
          </div>
        </SidebarMenuButton>
      </SidebarFooter>
    </>
  );
}
