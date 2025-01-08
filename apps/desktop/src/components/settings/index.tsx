import { type ReactNode, useState } from "react";
import {
  SettingsIcon,
  Settings2Icon,
  LayoutTemplateIcon,
  CalendarIcon,
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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@hypr/ui/components/ui/sidebar";

import Template from "./template";
import Calendar from "./calendar";
import General from "./general";
import { ScrollArea } from "@hypr/ui/components/ui/scroll-area";

const data = {
  nav: [
    { name: "General", icon: SettingsIcon },
    { name: "Calendar", icon: CalendarIcon },
    { name: "Template", icon: LayoutTemplateIcon },
  ],
} as const;

type NavItem = (typeof data.nav)[number];
type NavNames = NavItem["name"];

export default function SettingsDialog() {
  const [open, setOpen] = useState(true);
  const [active, setActive] = useState<NavNames>(data.nav[2].name);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-gray-500 hover:text-gray-900">
          <Settings2Icon size={16} />
        </button>
      </DialogTrigger>

      <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">Settings</DialogDescription>

        <SidebarProvider className="items-start">
          <Sidebar collapsible="none" className="hidden md:flex">
            <SidebarContent>
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
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton>
                        <span>Logout</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          {active === "Template" ? (
            <Content title="Template">
              <Template />
            </Content>
          ) : active === "Calendar" ? (
            <Content title="Calendar">
              <Calendar />
            </Content>
          ) : (
            <Content title="General">
              <General />
            </Content>
          )}
        </SidebarProvider>
      </DialogContent>
    </Dialog>
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
      <ScrollArea type="auto">{children}</ScrollArea>
    </main>
  );
}
