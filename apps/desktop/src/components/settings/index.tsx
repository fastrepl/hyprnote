import { type ReactNode, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SettingsIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@hypr/ui/components/ui/dialog";
import { SidebarProvider } from "@hypr/ui/components/ui/sidebar";
import { commands, type Template } from "@/types/tauri.gen";
import { Content } from "./components/breadcrumbs";
import { TemplateContent } from "./templates";
import GeneralComponent from "./general";
import ProfileComponent from "./profile";
import CalendarComponent from "./calendar";
import TemplateComponent from "./template";
import BillingComponent from "./billing";
import { SettingsSidebar, type NavNames } from "./components/sidebar";

export default function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<NavNames>("General");
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
      setActive("General");
    }
    if (active === "Templates") {
      setTemplateIndex(0);
    }
  }, [open, active]);

  return (
    <DialogWrapper open={open} setOpen={setOpen}>
      <SidebarProvider className="items-start">
        <SettingsSidebar
          active={active}
          setActive={setActive}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          customTemplates={templates.data?.custom || []}
          builtinTemplates={templates.data?.builtin || []}
          templateIndex={templateIndex}
          onTemplateSelect={handleTemplateSelect}
        />

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
        <button className="flex items-center justify-center rounded-md p-1 text-sm font-medium ring-offset-background transition-colors duration-200 hover:bg-neutral-200">
          <SettingsIcon className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </button>
      </DialogTrigger>
      <DialogContent className="flex h-[80vh] max-w-4xl gap-0 overflow-clip p-0">
        {children}
      </DialogContent>
    </Dialog>
  );
}
