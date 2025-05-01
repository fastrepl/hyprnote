import { Trans } from "@lingui/react/macro";
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
import {
  Extensions,
  Feedback,
  General,
  Lab,
  LocalAI,
  Notifications,
  Sound,
  TemplateEditor,
} from "@/components/settings/views";
import { useHypr } from "@/contexts";
import { EXTENSION_CONFIGS, ExtensionName, ExtensionNames } from "@hypr/extension-registry";
import { commands as dbCommands, type ExtensionDefinition, type Template } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";
import { useQuery } from "@tanstack/react-query";

const schema = z.object({
  tab: z.enum(TABS.map(t => t.name) as [Tab, ...Tab[]]).default("general"),
  extension: z.enum(ExtensionNames).default(ExtensionNames[0]),
});

const PATH = "/app/settings";
export const Route = createFileRoute(PATH)({
  validateSearch: zodValidator(schema),
  component: Component,
});

function Component() {
  const { userId } = useHypr();
  const navigate = useNavigate();
  const search = useSearch({ from: PATH });
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const { data: templatesData } = useQuery({
    queryKey: ["templates"],
    queryFn: () => dbCommands.listTemplates(),
  });

  const customTemplates = useMemo(() => {
    if (!templatesData || !userId) {
      return [];
    }
    return templatesData.filter(template => template.user_id === userId);
  }, [templatesData, userId]);

  const builtinTemplates = useMemo(() => {
    if (!templatesData || !userId) {
      return [];
    }
    return templatesData.filter(template => template.user_id !== userId);
  }, [templatesData, userId]);

  const filteredCustomTemplates = useMemo(() => {
    if (!searchQuery) {
      return customTemplates;
    }
    const query = searchQuery.toLowerCase();
    return customTemplates.filter(template =>
      template.title.toLowerCase().includes(query)
      || template.description.toLowerCase().includes(query)
      || template.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }, [customTemplates, searchQuery]);

  const filteredBuiltinTemplates = useMemo(() => {
    if (!searchQuery) {
      return builtinTemplates;
    }
    const query = searchQuery.toLowerCase();
    return builtinTemplates.filter(template =>
      template.title.toLowerCase().includes(query)
      || template.description.toLowerCase().includes(query)
      || template.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }, [builtinTemplates, searchQuery]);

  const handleClickTab = (tab: Tab) => {
    navigate({ to: PATH, search: { ...search, tab } });
    setSearchQuery("");
  };

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

  const extensionsList = useMemo(() => {
    return EXTENSION_CONFIGS.map(
      (config) => ({
        id: config.id,
        title: config.title,
        description: config.description || "",
        tags: config.tags || [],
        default: config.default || false,
        cloud_only: config.cloud_only || false,
        plugins: config.plugins || [],
        implemented: true,
      } as ExtensionDefinition),
    );
  }, []);

  const filteredExtensions = useMemo(() => {
    if (!searchQuery) {
      return extensionsList;
    }

    const query = searchQuery.toLowerCase();
    return extensionsList.filter(
      (extension) =>
        extension.title.toLowerCase().includes(query)
        || extension.description.toLowerCase().includes(query)
        || extension.tags.some((tag) => tag.toLowerCase().includes(query)),
    );
  }, [extensionsList, searchQuery]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [],
  );

  const handleExtensionSelect = useCallback(
    (extension: ExtensionName) => {
      navigate({ to: PATH, search: { ...search, extension } });
    },
    [navigate, search],
  );

  const selectedExtension = useMemo(() => {
    return filteredExtensions.find(
      (extension) => extension.id === search.extension,
    )!;
  }, [filteredExtensions, search.extension]);

  return (
    <div className="relative flex h-screen w-screen overflow-hidden">
      <div className="flex h-full w-full flex-col overflow-hidden bg-background">
        <div className="flex h-full">
          <div className="w-60 border-r">
            <div
              data-tauri-drag-region
              className="flex items-center h-11 justify-end px-2"
            >
              {(search.tab === "templates" || search.tab === "extensions") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-neutral-200 text-neutral-600 hover:text-neutral-600"
                  onClick={() => handleClickTab("general")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>
                    <Trans>Back to Settings</Trans>
                  </span>
                </Button>
              )}
            </div>

            {search.tab !== "templates" && search.tab !== "extensions"
              ? <MainSidebar current={search.tab} onTabClick={handleClickTab} />
              : (
                <div className="flex h-full flex-col">
                  {search.tab === "templates" && (
                    <TemplatesSidebar
                      searchQuery={searchQuery}
                      onSearchChange={handleSearchChange}
                      customTemplates={filteredCustomTemplates}
                      builtinTemplates={filteredBuiltinTemplates}
                      selectedTemplate={selectedTemplate}
                      onTemplateSelect={setSelectedTemplate}
                    />
                  )}

                  {search.tab === "extensions" && (
                    <ExtensionsSidebar
                      searchQuery={searchQuery}
                      onSearchChange={handleSearchChange}
                      extensions={filteredExtensions}
                      selectedExtension={search.extension}
                      onExtensionSelect={handleExtensionSelect}
                    />
                  )}
                </div>
              )}
          </div>

          <div className="flex-1 flex h-full w-full flex-col overflow-hidden">
            <SettingsHeader
              current={search.tab}
              onCreateTemplate={search.tab === "templates" ? handleCreateTemplate : undefined}
            />

            <div className="flex-1 overflow-auto p-6">
              {search.tab === "general" && <General />}
              {search.tab === "notifications" && <Notifications />}
              {search.tab === "sound" && <Sound />}
              {search.tab === "templates" && (
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
                />
              )}
              {search.tab === "extensions" && (
                <Extensions
                  selectedExtension={selectedExtension}
                  onExtensionSelect={handleExtensionSelect}
                />
              )}
              {search.tab === "ai" && <LocalAI />}
              {search.tab === "lab" && <Lab />}
              {search.tab === "feedback" && <Feedback />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
