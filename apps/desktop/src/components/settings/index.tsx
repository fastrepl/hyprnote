import { type ReactNode, useEffect, useState } from "react";
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

import GeneralComponent from "./general";
import ProfileComponent from "./profile";
import CalendarComponent from "./calendar";
import TemplateComponent from "./template";
import BillingComponent from "./billing";

import type { Template } from "@/types/tauri";

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
  const [active, setActive] = useState<NavNames>(data.nav[3].name);
  const [templateIndex, setTemplateIndex] = useState(0);

  useEffect(() => {
    if (active === "Template") {
      setTemplateIndex(0);
    }
  }, [active]);

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
                    {BUILTIN_TEMPLATES.map((template, index) => (
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
            <TemplateComponent template={BUILTIN_TEMPLATES[templateIndex]} />
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

const BUILTIN_TEMPLATES: Template[] = [
  {
    id: "1",
    title: "Standup",
    description:
      "Share updates, highlight roadblocks, and align priorities for the day",
    sections: [
      {
        title: "Yesterday",
        description: `
        - Each participant shares key accomplishments from the previous day.
        - Focus on tasks relevant to the team/project.`.trim(),
      },
      {
        title: "Today",
        description: `
        - Outline what each participant plans to work on.
        - Highlight priority tasks.`.trim(),
      },
      {
        title: "Roadblocks",
        description: `
        - Mention obstacles preventing progress.
        - Identify who can help or next steps for resolution.`.trim(),
      },
    ],
  },
  {
    id: "2",
    title: "Kickoff",
    description:
      "Align stakeholders and set the tone for a new project or initiative",
    sections: [
      {
        title: "Objective",
        description: `
        - Define the project's purpose and expected outcomes.
        - Ensure alignment among all attendees.`.trim(),
      },
      {
        title: "Scope & Deliverables",
        description: `
        - Detail project boundaries, key deliverables, and success criteria.`.trim(),
      },
      {
        title: "Timeline",
        description: `
        - Share high-level milestones and deadlines.`.trim(),
      },
      {
        title: "Responsibilities",
        description: `
        - Assign ownership for each aspect of the project.
        - Include contact points for follow-ups.`.trim(),
      },
    ],
  },
];
