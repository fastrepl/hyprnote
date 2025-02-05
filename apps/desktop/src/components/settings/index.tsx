import { type ReactNode, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  DialogHeader,
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
import { ScrollArea } from "@hypr/ui/components/ui/scroll-area";

import GeneralComponent from "./general";
import ProfileComponent from "./profile";
import CalendarComponent from "./calendar";
import TemplateComponent from "./template";
import BillingComponent from "./billing";

import { commands, type Template } from "@/types/tauri.gen";

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
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<NavNames>(data.nav[3].name);
  const [templateIndex, setTemplateIndex] = useState(0);

  const templates = useQuery({
    queryKey: ["settings", "templates"],
    queryFn: async () => {
      const [builtin, custom] = await Promise.all([
        commands.listBuiltinTemplates(),
        commands.listTemplates(),
      ]);
      return { builtin, custom };
    },
  });

  const handleUpdateTemplate = (template: Template) => {
    commands.upsertTemplate(template);
  };

  useEffect(() => {
    if (!open) {
      setActive(data.nav[0].name);
    }
    if (active === "Template") {
      setTemplateIndex(0);
    }
  }, [open, active]);

  return (
    <DialogWrapper open={open} setOpen={setOpen}>
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
                    {templates.data?.custom.map((template, index) => (
                      <SidebarMenuItem key={template.id}>
                        <SidebarMenuButton
                          isActive={index === templateIndex}
                          onClick={() => setTemplateIndex(index)}
                        >
                          {template.title}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
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

        <Content title={active}>
          {active === "Profile" ? (
            <ProfileComponent />
          ) : active === "General" ? (
            <GeneralComponent />
          ) : active === "Calendar" ? (
            <CalendarComponent />
          ) : active === "Template" ? (
            templates.data?.builtin && (
              <TemplateComponent
                disabled={true}
                template={templates.data?.builtin[templateIndex]}
                onTemplateUpdate={handleUpdateTemplate}
              />
            )
          ) : active === "Team & Billing" ? (
            <BillingComponent />
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
    <main className="flex flex-1 flex-col overflow-hidden">
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

function DialogWrapper({
  open,
  setOpen,
  children,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-gray-500 hover:text-gray-900">
          <Settings2Icon size={16} />
        </button>
      </DialogTrigger>

      <DialogContent className="h-full max-h-[700px] w-full max-w-[1000px] overflow-hidden p-0">
        <DialogHeader className="hidden">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
