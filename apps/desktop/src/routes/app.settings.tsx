import { cn } from "@hypr/ui/lib/utils";
import { Trans } from "@lingui/react/macro";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import {
  ArrowLeft,
  BellIcon,
  BlocksIcon,
  CalendarIcon,
  CreditCardIcon,
  FilePlusIcon,
  FileTextIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { z } from "zod";

import Billing from "@/components/settings/views/billing";
import Calendar from "@/components/settings/views/calendar";
import Extensions from "@/components/settings/views/extension";
import General from "@/components/settings/views/general";
import LocalAI from "@/components/settings/views/local-ai";
import Notifications from "@/components/settings/views/notifications";
import Profile from "@/components/settings/views/profile";
import Team from "@/components/settings/views/team";
import TemplateEditor from "@/components/settings/views/template";
import { useHypr } from "@/contexts";
import { EXTENSION_CONFIGS } from "@hypr/extension-registry";
import { type ExtensionDefinition, type Template } from "@hypr/plugin-db";
import { commands as dbCommands } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";

const TABS = [
  "general",
  "profile",
  "ai",
  "calendar",
  "notifications",
  "templates",
  "extensions",
  "team",
  "billing",
] as const;

type Tab = typeof TABS[number];

const schema = z.object({
  current: z.enum(TABS).default("general"),
});

const PATH = "/app/settings";
export const Route = createFileRoute(PATH)({
  validateSearch: zodValidator(schema),
  component: Component,
});

function Component() {
  const { current } = useSearch({ from: PATH });
  const navigate = useNavigate();
  const { userId } = useHypr();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedExtension, setSelectedExtension] = useState<ExtensionDefinition | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Fetch templates from the database
  const { data: templatesData } = useQuery({
    queryKey: ["templates"],
    queryFn: () => dbCommands.listTemplates(),
  });

  const customTemplates = useMemo(() => {
    if (!templatesData || !userId) return [];
    return templatesData.filter(template => template.user_id === userId);
  }, [templatesData, userId]);

  const builtinTemplates = useMemo(() => {
    if (!templatesData || !userId) return [];
    return templatesData.filter(template => template.user_id !== userId);
  }, [templatesData, userId]);

  // Use real extension data from EXTENSION_CONFIGS
  const extensionsList = useMemo(() => {
    return EXTENSION_CONFIGS.map(config => ({
      id: config.id,
      title: config.title,
      description: config.description || "",
      tags: config.tags || [],
      default: config.default || false,
      cloud_only: config.cloud_only || false,
      plugins: config.plugins || [],
      implemented: true,
    } as ExtensionDefinition));
  }, []);

  const handleClickTab = (tab: Tab) => {
    navigate({ to: PATH, search: { current: tab } });
    // Reset search when changing tabs
    setSearchQuery("");
  };

  // Filter templates based on search query
  const filteredCustomTemplates = useMemo(() => {
    if (!searchQuery) return customTemplates;
    const query = searchQuery.toLowerCase();
    return customTemplates.filter(template =>
      template.title.toLowerCase().includes(query)
      || template.description.toLowerCase().includes(query)
      || template.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }, [customTemplates, searchQuery]);

  const filteredBuiltinTemplates = useMemo(() => {
    if (!searchQuery) return builtinTemplates;
    const query = searchQuery.toLowerCase();
    return builtinTemplates.filter(template =>
      template.title.toLowerCase().includes(query)
      || template.description.toLowerCase().includes(query)
      || template.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }, [builtinTemplates, searchQuery]);

  // Filter extensions based on search query
  const filteredExtensions = useMemo(() => {
    if (!searchQuery) return extensionsList;

    const query = searchQuery.toLowerCase();
    return extensionsList.filter(
      (extension) =>
        extension.title.toLowerCase().includes(query)
        || extension.description.toLowerCase().includes(query)
        || extension.tags.some((tag) => tag.toLowerCase().includes(query)),
    );
  }, [extensionsList, searchQuery]);

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleCreateTemplate = useCallback(() => {
    const newTemplate: Template = {
      id: crypto.randomUUID(),
      user_id: userId,
      title: "Untitled Template",
      description: "",
      tags: [],
      sections: [],
    };

    // Here you would typically save the template to the database
    // dbCommands.saveTemplate(newTemplate);

    setSelectedTemplate(newTemplate.id);
    handleClickTab("templates");
  }, [userId, handleClickTab]);

  const handleTemplateUpdate = useCallback((updatedTemplate: Template) => {
    // Here you would typically update the template in the database
    // dbCommands.updateTemplate(updatedTemplate);
  }, []);

  return (
    <div className="relative flex h-screen w-screen overflow-hidden">
      <div className="flex h-full w-full flex-col overflow-hidden bg-background">
        <div className="flex h-full">
          <div className="w-60 border-r">
            <div
              data-tauri-drag-region
              className="flex items-center h-11 justify-end px-2"
            >
              {(current === "templates" || current === "extensions") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-neutral-200"
                  onClick={() => handleClickTab("general")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Settings</span>
                </Button>
              )}
            </div>

            {current !== "templates" && current !== "extensions"
              ? (
                <div className="flex h-full flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-2">
                    <div className="space-y-1">
                      {TABS.map((tab) => (
                        <button
                          key={tab}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg p-2 text-sm text-neutral-600 hover:bg-neutral-100",
                            current === tab && "bg-neutral-100 font-medium",
                          )}
                          onClick={() => handleClickTab(tab)}
                        >
                          <TabIcon tab={tab} />
                          <span>
                            {tab === "general"
                              ? <Trans>General</Trans>
                              : tab === "profile"
                              ? <Trans>Profile</Trans>
                              : tab === "ai"
                              ? <Trans>AI</Trans>
                              : tab === "calendar"
                              ? <Trans>Calendar</Trans>
                              : tab === "notifications"
                              ? <Trans>Notifications</Trans>
                              : tab === "templates"
                              ? <Trans>Templates</Trans>
                              : tab === "extensions"
                              ? <Trans>Extensions</Trans>
                              : tab === "team"
                              ? <Trans>Team</Trans>
                              : tab === "billing"
                              ? <Trans>Billing</Trans>
                              : null}
                          </span>
                          {(tab === "team" || tab === "billing") && (
                            <span className="ml-auto text-xs text-neutral-400">
                              <Trans>Coming Soon</Trans>
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )
              : (
                <div className="flex h-full flex-col">
                  {current === "templates" && (
                    <>
                      <div className="p-2">
                        <div className="relative flex items-center">
                          <SearchIcon className="absolute left-2 h-4 w-4 text-neutral-400" />
                          <input
                            type="text"
                            placeholder="Search templates..."
                            className="w-full rounded-md border border-neutral-200 bg-white py-1 pl-8 pr-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                            value={searchQuery}
                            onChange={handleSearchChange}
                          />
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        <div className="space-y-4 p-2">
                          {filteredCustomTemplates.length > 0 && (
                            <div>
                              <h3 className="mb-1 px-2 text-xs font-medium uppercase text-neutral-500">
                                <Trans>Your Templates</Trans>
                              </h3>
                              <div className="space-y-1">
                                {filteredCustomTemplates.map((template) => (
                                  <button
                                    key={template.id}
                                    className={cn(
                                      "flex w-full items-center gap-2 rounded-lg p-2 text-sm text-neutral-600 hover:bg-neutral-100",
                                      selectedTemplate === template.id && "bg-neutral-100 font-medium",
                                    )}
                                    onClick={() => setSelectedTemplate(template.id)}
                                  >
                                    <FileTextIcon className="h-4 w-4" />
                                    <span>{template.title}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {filteredBuiltinTemplates.length > 0 && (
                            <div>
                              <h3 className="mb-1 px-2 text-xs font-medium uppercase text-neutral-500">
                                <Trans>Built-in Templates</Trans>
                              </h3>
                              <div className="space-y-1">
                                {filteredBuiltinTemplates.map((template) => (
                                  <button
                                    key={template.id}
                                    className={cn(
                                      "flex w-full items-center gap-2 rounded-lg p-2 text-sm text-neutral-600 hover:bg-neutral-100",
                                      selectedTemplate === template.id && "bg-neutral-100 font-medium",
                                    )}
                                    onClick={() => setSelectedTemplate(template.id)}
                                  >
                                    <FileTextIcon className="h-4 w-4" />
                                    <span>{template.title}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {current === "extensions" && (
                    <>
                      <div className="p-2">
                        <div className="relative flex items-center">
                          <SearchIcon className="absolute left-2 h-4 w-4 text-neutral-400" />
                          <input
                            type="text"
                            placeholder="Search extensions..."
                            className="w-full rounded-md border border-neutral-200 bg-white py-1 pl-8 pr-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                            value={searchQuery}
                            onChange={handleSearchChange}
                          />
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto">
                        <div className="space-y-1 p-2">
                          {filteredExtensions.map((extension) => (
                            <button
                              key={extension.id}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-lg p-2 text-sm text-neutral-600 hover:bg-neutral-100",
                                selectedExtension?.id === extension.id && "bg-neutral-100 font-medium",
                              )}
                              onClick={() => setSelectedExtension(extension)}
                              disabled={!extension.implemented}
                            >
                              <BlocksIcon className="h-4 w-4" />
                              <div className="flex flex-1 items-center justify-between">
                                <span>{extension.title}</span>
                                {!extension.implemented && (
                                  <span className="text-xs text-neutral-400">Coming Soon</span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
          </div>

          <div className="flex-1 flex h-full w-full flex-col overflow-hidden">
            <header data-tauri-drag-region className="h-11 w-full flex items-center justify-between border-b px-2">
              <div className="w-40" data-tauri-drag-region></div>

              <h1 className="text-md font-semibold capitalize" data-tauri-drag-region>
                <Trans>{current}</Trans>
              </h1>

              <div className="flex w-40 items-center justify-end" data-tauri-drag-region>
                {current === "templates" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex items-center gap-1 text-sm"
                        onClick={handleCreateTemplate}
                      >
                        <FilePlusIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <Trans>Create new template</Trans>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </header>

            <div className="flex-1 overflow-auto p-6">
              {current === "general" && <General />}
              {current === "profile" && <Profile />}
              {current === "ai" && <LocalAI />}
              {current === "calendar" && <Calendar />}
              {current === "notifications" && <Notifications />}
              {current === "templates" && (
                <TemplateEditor
                  disabled={false}
                  template={customTemplates.find(template => template.id === selectedTemplate)
                    || builtinTemplates.find(template => template.id === selectedTemplate) || {
                    id: selectedTemplate || "",
                    title: "",
                    description: "",
                    sections: [],
                    tags: [],
                    user_id: userId,
                  }}
                  onTemplateUpdate={handleTemplateUpdate}
                />
              )}
              {current === "extensions" && (
                <Extensions
                  selectedExtension={selectedExtension}
                  onExtensionSelect={setSelectedExtension}
                />
              )}
              {current === "team" && <Team />}
              {current === "billing" && <Billing />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabIcon({ tab }: { tab: Tab }) {
  switch (tab) {
    case "general":
      return <SettingsIcon className="h-4 w-4" />;
    case "profile":
      return <UserIcon className="h-4 w-4" />;
    case "ai":
      return <SparklesIcon className="h-4 w-4" />;
    case "calendar":
      return <CalendarIcon className="h-4 w-4" />;
    case "notifications":
      return <BellIcon className="h-4 w-4" />;
    case "templates":
      return <FileTextIcon className="h-4 w-4" />;
    case "extensions":
      return <BlocksIcon className="h-4 w-4" />;
    case "team":
      return <UsersIcon className="h-4 w-4" />;
    case "billing":
      return <CreditCardIcon className="h-4 w-4" />;
    default:
      return null;
  }
}
