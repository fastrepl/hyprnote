import { type ReactNode, useState } from "react";
import {
  SettingsIcon,
  Settings2Icon,
  LayoutTemplateIcon,
  CalendarIcon,
  UserIcon,
  CreditCardIcon,
  ArrowLeftFromLineIcon,
} from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@hypr/ui/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@hypr/ui/components/ui/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@hypr/ui/components/ui/sidebar";
import { ScrollArea } from "@hypr/ui/components/ui/scroll-area";

import General from "./general";
import Profile from "./profile";
import Calendar from "./calendar";
import Template from "./template";
import Billing from "./billing";

const data = {
  nav: [
    { name: "General", icon: SettingsIcon },
    { name: "Profile", icon: UserIcon },
    { name: "Calendar", icon: CalendarIcon },
    { name: "Template", icon: LayoutTemplateIcon },
    { name: "Team & Billing", icon: CreditCardIcon },
  ],
} as const;

type NavItem = (typeof data.nav)[number];
type NavNames = NavItem["name"];

export default function SettingsDialog() {
  const [active, setActive] = useState<NavNames>(data.nav[2].name);

  return (
    <DialogWrapper>
      <SidebarProvider className="items-start">
        <Sidebar collapsible="none" className="hidden md:flex">
          <SidebarContent>
            {active === "Template" ? (
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={true}
                        className="flex flex-row gap-2"
                        onClick={() => setActive(data.nav[0].name)}
                      >
                        <ArrowLeftFromLineIcon />
                        <span>Template</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton>{"template 1"}</SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton>{"template 2"}</SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : (
              <>
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

                <SidebarGroup>
                  <SidebarGroupLabel>Support</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton>123</SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton>123</SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}
          </SidebarContent>
        </Sidebar>

        <Content title={active}>
          {active === "Profile" ? (
            <Profile />
          ) : active === "General" ? (
            <General />
          ) : active === "Calendar" ? (
            <Calendar />
          ) : active === "Template" ? (
            <Template />
          ) : active === "Team & Billing" ? (
            <Billing />
          ) : null}
        </Content>
      </SidebarProvider>
    </DialogWrapper>
  );
}

interface ContentProps {
  title: string;
  children: ReactNode;
}

function Content({ title, children }: ContentProps) {
  return (
    <main className="flex h-[480px] flex-1 flex-col overflow-hidden">
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink>Settings</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <ScrollArea className="px-4" type="auto">
        {children}
      </ScrollArea>
    </main>
  );
}

function DialogWrapper({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-gray-500 hover:text-gray-900">
          <Settings2Icon size={16} />
        </button>
      </DialogTrigger>

      <DialogContent className="h-[700px] w-[1000px] overflow-hidden p-0">
        {children}
      </DialogContent>
    </Dialog>
  );
}
