import { Trans } from "@lingui/react/macro";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
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
  // TemplatesSidebar,
} from "@/components/settings/components";
import {
  Calendar,
  Extensions,
  General,
  // Lab,
  // LocalAI,
  // Notifications,
  Sound,
  Profile,
  // TemplateEditor,
} from "@/components/settings/views";
import {
  EXTENSION_CONFIGS,
  ExtensionName,
  ExtensionNames,
} from "@hypr/extension-registry";
import { type ExtensionDefinition } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";

const schema = z.object({
  tab: z.enum(TABS).default("general"),
  extension: z.enum(ExtensionNames).default(ExtensionNames[0]),
});

const PATH = "/app/settings";
export const Route = createFileRoute(PATH)({
  validateSearch: zodValidator(schema),
  component: Component,
});

function Component() {
  const navigate = useNavigate();
  const search = useSearch({ from: PATH });
  const [searchQuery, setSearchQuery] = useState<string>("");

  const extensionsList = useMemo(() => {
    return EXTENSION_CONFIGS.map(
      (config) =>
        ({
          id: config.id,
          title: config.title,
          description: config.description || "",
          tags: config.tags || [],
          default: config.default || false,
          cloud_only: config.cloud_only || false,
          plugins: config.plugins || [],
          implemented: true,
        } as ExtensionDefinition)
    );
  }, []);

  const handleClickTab = (tab: Tab) => {
    navigate({ to: PATH, search: { ...search, tab } });
    setSearchQuery("");
  };

  const filteredExtensions = useMemo(() => {
    if (!searchQuery) {
      return extensionsList;
    }

    const query = searchQuery.toLowerCase();
    return extensionsList.filter(
      (extension) =>
        extension.title.toLowerCase().includes(query) ||
        extension.description.toLowerCase().includes(query) ||
        extension.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [extensionsList, searchQuery]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    []
  );

  const handleExtensionSelect = useCallback(
    (extension: ExtensionName) => {
      navigate({ to: PATH, search: { ...search, extension } });
    },
    [navigate, search]
  );

  const selectedExtension = useMemo(() => {
    return filteredExtensions.find(
      (extension) => extension.id === search.extension
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
              {/* {(current === "templates" || current === "extensions") && ( */}
              {search.tab === "extensions" && (
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

            {/* {current !== "templates" && current !== "extensions" */}
            {search.tab !== "extensions" ? (
              <MainSidebar current={search.tab} onTabClick={handleClickTab} />
            ) : (
              <div className="flex h-full flex-col">
                {/* {current === "templates" && (
                    <TemplatesSidebar
                      searchQuery={searchQuery}
                      onSearchChange={handleSearchChange}
                      customTemplates={filteredCustomTemplates}
                      builtinTemplates={filteredBuiltinTemplates}
                      selectedTemplate={selectedTemplate}
                      onTemplateSelect={setSelectedTemplate}
                    />
                  )} */}

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
              // onCreateTemplate={current === "templates" ? handleCreateTemplate : undefined}
            />

            <div className="flex-1 overflow-auto p-6">
              {search.tab === "general" && <General />}
              {search.tab === "profile" && <Profile />}
              {/* {search.tab === "ai" && <LocalAI />} */}
              {search.tab === "calendar" && <Calendar />}
              {/* {current === "notifications" && <Notifications />} */}
              {search.tab === "sound" && <Sound />}
              {/* {current === "templates" && (
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
              )} */}
              {search.tab === "extensions" && (
                <Extensions
                  selectedExtension={selectedExtension}
                  onExtensionSelect={handleExtensionSelect}
                />
              )}
              {/* {current === "team" && <Team />}
              {current === "billing" && <Billing />} */}
              {/* {current === "lab" && <Lab />} */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
