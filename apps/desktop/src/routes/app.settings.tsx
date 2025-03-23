import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { ArrowLeft } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { z } from "zod";

import {
  ExtensionsSidebar,
  MainSidebar,
  SettingsHeader,
  type Tab,
  TABS,
  TemplatesSidebar,
} from "@/components/settings/components";
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
    setSearchQuery("");
  };

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

    setSelectedTemplate(newTemplate.id);
    handleClickTab("templates");
  }, [userId, handleClickTab]);

  const handleTemplateUpdate = useCallback((updatedTemplate: Template) => {
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
                <MainSidebar
                  current={current}
                  onTabClick={handleClickTab}
                />
              )
              : (
                <div className="flex h-full flex-col">
                  {current === "templates" && (
                    <TemplatesSidebar
                      searchQuery={searchQuery}
                      onSearchChange={handleSearchChange}
                      customTemplates={filteredCustomTemplates}
                      builtinTemplates={filteredBuiltinTemplates}
                      selectedTemplate={selectedTemplate}
                      onTemplateSelect={setSelectedTemplate}
                    />
                  )}

                  {current === "extensions" && (
                    <ExtensionsSidebar
                      searchQuery={searchQuery}
                      onSearchChange={handleSearchChange}
                      extensions={filteredExtensions}
                      selectedExtension={selectedExtension}
                      onExtensionSelect={setSelectedExtension}
                    />
                  )}
                </div>
              )}
          </div>

          <div className="flex-1 flex h-full w-full flex-col overflow-hidden">
            <SettingsHeader
              current={current}
              onCreateTemplate={current === "templates" ? handleCreateTemplate : undefined}
            />

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
