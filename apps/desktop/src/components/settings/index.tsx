import { type ReactNode, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  SettingsIcon,
  UserIcon,
  CalendarIcon,
  FileTextIcon,
  CreditCardIcon,
  ChevronLeftIcon,
  Settings2Icon,
} from "lucide-react";

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
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
} from "@hypr/ui/components/ui/sidebar";

import { commands, type Template } from "@/types/tauri.gen";
import { Content } from "./components/breadcrumbs";
import { TemplateList, TemplateContent } from "./templates";
import GeneralComponent from "./general";
import ProfileComponent from "./profile";
import CalendarComponent from "./calendar";
import TemplateComponent from "./template";
import BillingComponent from "./billing";

const data = {
  nav: [
    { name: "General", icon: SettingsIcon },
    { name: "Profile", icon: UserIcon },
    { name: "Calendar", icon: CalendarIcon },
    { name: "Templates", icon: FileTextIcon },
    { name: "Team & Billing", icon: CreditCardIcon },
  ],
} as const;

type NavItem = (typeof data.nav)[number];
type NavNames = NavItem["name"];

export default function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<NavNames>(data.nav[3].name);
  const [templateIndex, setTemplateIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );

  const templates = useQuery({
    queryKey: ["settings", "templates"],
    queryFn: async () => {
      const [builtin, custom] = await Promise.all([
        commands.listBuiltinTemplates(),
        commands.listTemplates(),
      ]);
      return { builtin: builtin || [], custom: custom || [] };
    },
  });

  const handleUpdateTemplate = (template: Template) => {
    commands.upsertTemplate(template);
  };

  const handleTemplateSelect = (template: Template, index: number) => {
    setTemplateIndex(index);
    setSelectedTemplate(template);
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (!open) {
      setActive(data.nav[0].name);
    }
    if (active === "Templates") {
      setTemplateIndex(0);
    }
  }, [open, active]);

  return (
    <DialogWrapper open={open} setOpen={setOpen}>
      <SidebarProvider className="items-start">
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
                  onSearchChange={setSearchQuery}
                  customTemplates={templates.data?.custom || []}
                  builtinTemplates={templates.data?.builtin || []}
                  selectedIndex={templateIndex}
                  onTemplateSelect={handleTemplateSelect}
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

        <Content title={active} selectedTemplate={selectedTemplate}>
          {active === "Profile" ? (
            <ProfileComponent />
          ) : active === "General" ? (
            <GeneralComponent />
          ) : active === "Calendar" ? (
            <CalendarComponent />
          ) : active === "Templates" ? (
            <TemplateContent>
              {templates.data?.custom &&
                templates.data.custom[templateIndex] && (
                  <TemplateComponent
                    disabled={false}
                    template={templates.data.custom[templateIndex]}
                    onTemplateUpdate={handleUpdateTemplate}
                  />
                )}
            </TemplateContent>
          ) : active === "Team & Billing" ? (
            <BillingComponent />
          ) : null}
        </Content>
      </SidebarProvider>
    </DialogWrapper>
  );
}

interface DialogWrapperProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  children: ReactNode;
}

function DialogWrapper({ open, setOpen, children }: DialogWrapperProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex h-8 w-8 items-center justify-center rounded-md border border-input bg-transparent p-0 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <Settings2Icon className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </button>
      </DialogTrigger>
      <DialogContent className="flex h-[80vh] max-w-4xl gap-0 overflow-clip p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
