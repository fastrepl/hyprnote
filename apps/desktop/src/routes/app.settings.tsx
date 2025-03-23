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
  HeartIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
  TagIcon,
  UserIcon,
  UsersIcon,
  ZapIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import { type ExtensionDefinition } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";

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
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedExtension, setSelectedExtension] = useState<ExtensionDefinition | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleClickTab = (tab: Tab) => {
    navigate({ to: PATH, search: { current: tab } });
    // Reset search when changing tabs
    setSearchQuery("");
  };

  // Mock data for templates and extensions
  const customTemplates = [
    {
      id: "template1",
      user_id: "user123",
      title: "Meeting Notes",
      description: "Template for meeting notes",
      tags: ["meeting", "notes"],
      sections: [],
    },
    {
      id: "template2",
      user_id: "user123",
      title: "Project Plan",
      description: "Template for project planning",
      tags: ["project", "planning"],
      sections: [],
    },
  ];

  const builtinTemplates = [
    {
      id: "template3",
      user_id: "system",
      title: "Weekly Report",
      description: "Official template for weekly reports",
      tags: ["report", "weekly"],
      sections: [],
    },
  ];

  const extensionsList = [
    {
      id: "ext1",
      name: "Calendar",
      implemented: true,
      title: "Calendar",
      description: "Manage your calendar",
      tags: ["calendar", "time"],
    },
    {
      id: "ext2",
      name: "Tasks",
      implemented: true,
      title: "Tasks",
      description: "Track your tasks",
      tags: ["tasks", "productivity"],
    },
    {
      id: "ext3",
      name: "Weather",
      implemented: false,
      title: "Weather",
      description: "Check the weather",
      tags: ["weather"],
    },
  ];

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
    return extensionsList.filter(ext =>
      ext.name.toLowerCase().includes(query)
      || ext.title.toLowerCase().includes(query)
      || ext.description.toLowerCase().includes(query)
      || ext.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }, [extensionsList, searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleCreateTemplate = () => {
    const newTemplate = {
      id: crypto.randomUUID(),
      user_id: "user123",
      title: "Untitled Template",
      description: "",
      tags: [],
      sections: [],
    };
    setSelectedTemplate(newTemplate.id);
    // Here you would typically add the template to your templates list
  };

  return (
    <div className="relative flex h-screen w-screen overflow-hidden">
      <div className="h-full flex flex-col overflow-hidden border-r bg-neutral-50 w-60">
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

        <nav className="flex-1 overflow-auto py-2">
          {(current === "templates" || current === "extensions")
            ? (
              // Special sidebar for templates and extensions
              <div className="flex flex-col h-full">
                {current === "templates" && (
                  <>
                    <div className="px-2 pb-2">
                      <div className="relative flex items-center">
                        <SearchIcon className="absolute left-2 h-4 w-4 text-neutral-400" />
                        <input
                          placeholder="Search templates..."
                          className="w-full ps-8 py-2 text-sm text-neutral-700 bg-transparent focus:outline-none"
                          value={searchQuery}
                          onChange={handleSearchChange}
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-none">
                      {customTemplates.length > 0 && (
                        <section className="p-2">
                          <h3 className="flex items-center gap-2 p-2 text-sm font-semibold text-neutral-700">
                            <HeartIcon className="h-4 w-4" />
                            <Trans>My Templates</Trans>
                          </h3>
                          <nav className="mt-2 rounded-md bg-neutral-50 p-2">
                            <ul>
                              {filteredCustomTemplates.map((template) => (
                                <li key={template.id}>
                                  <button
                                    onClick={() => setSelectedTemplate(template.id)}
                                    className={cn(
                                      "flex w-full flex-col gap-1 rounded-lg p-2 text-sm text-neutral-600",
                                      selectedTemplate === template.id
                                        ? "bg-neutral-200 font-bold text-neutral-700"
                                        : "hover:bg-neutral-100",
                                    )}
                                  >
                                    <span>{template.title || "Untitled Template"}</span>
                                    {template.tags && template.tags.length > 0 && (
                                      <div className="flex items-center gap-1 text-xs text-neutral-500">
                                        <TagIcon className="h-3 w-3" />
                                        <span>{template.tags.join(", ")}</span>
                                      </div>
                                    )}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </nav>
                        </section>
                      )}

                      <section className="p-2">
                        <h3 className="flex items-center gap-2 p-2 text-sm font-semibold text-neutral-700">
                          <ZapIcon className="h-4 w-4" />
                          <Trans>Official Templates</Trans>
                        </h3>
                        <nav className="mt-2 rounded-md bg-neutral-50 p-2">
                          <ul>
                            {filteredBuiltinTemplates.map((template) => (
                              <li key={template.id}>
                                <button
                                  onClick={() => setSelectedTemplate(template.id)}
                                  className={cn(
                                    "flex w-full flex-col gap-1 rounded-lg p-2 text-sm text-neutral-600",
                                    selectedTemplate === template.id
                                      ? "bg-neutral-200 font-bold text-neutral-700"
                                      : "hover:bg-neutral-100",
                                  )}
                                >
                                  <span>{template.title || "Untitled Template"}</span>
                                  {template.tags && template.tags.length > 0 && (
                                    <div className="flex items-center gap-1 text-xs text-neutral-500">
                                      <TagIcon className="h-3 w-3" />
                                      <span>{template.tags.join(", ")}</span>
                                    </div>
                                  )}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </nav>
                      </section>
                    </div>

                    <footer className="mt-auto border-t p-2">
                      <Button
                        variant="ghost"
                        onClick={handleCreateTemplate}
                        className="flex w-full items-center gap-2 rounded-lg p-2 text-sm text-neutral-600 hover:bg-neutral-100"
                      >
                        <FilePlusIcon className="h-4 w-4" />
                        <Trans>Create Template</Trans>
                      </Button>
                    </footer>
                  </>
                )}

                {current === "extensions" && (
                  <>
                    <div className="bg-background p-2">
                      <div className="relative flex items-center">
                        <SearchIcon className="absolute left-2 h-4 w-4 text-neutral-400" />
                        <input
                          placeholder="Search extensions..."
                          className="w-full ps-8 py-2 text-sm text-neutral-700 bg-transparent focus:outline-none"
                          value={searchQuery}
                          onChange={handleSearchChange}
                        />
                      </div>
                    </div>

                    <div className="flex-1 p-2 overflow-hidden">
                      <div className="h-full overflow-y-auto scrollbar-none">
                        {filteredExtensions.map((extension) => (
                          <button
                            key={extension.id}
                            onClick={() => setSelectedExtension(extension as unknown as ExtensionDefinition)}
                            className={cn(
                              "flex w-full flex-col rounded-lg p-2 text-left mb-2",
                              selectedExtension?.id === extension.id ? "bg-neutral-200" : "hover:bg-neutral-100",
                            )}
                          >
                            <div className="font-medium text-neutral-700 mb-1">{extension.title}</div>

                            <p className="text-xs text-neutral-600 line-clamp-1 mb-2">
                              {extension.description}
                            </p>

                            <div className="flex flex-wrap overflow-hidden h-6 gap-0.5">
                              {extension.tags.length > 0
                                ? (
                                  extension.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="text-xs bg-neutral-50 text-neutral-600 px-1.5 py-0.5 rounded border border-neutral-200 mr-1 mb-1"
                                    >
                                      {tag}
                                    </span>
                                  ))
                                )
                                : (
                                  <span className="text-xs text-neutral-500 px-1.5 py-0.5 rounded border border-dashed border-neutral-300">
                                    no tags
                                  </span>
                                )}

                              {!extension.implemented && (
                                <div className="ml-auto text-xs bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                                  <Trans>Coming Soon</Trans>
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
            : (
              // Regular settings sidebar
              <ul className="space-y-1 px-2">
                {TABS.map((tab) => (
                  <li key={tab}>
                    <Button
                      variant="ghost"
                      onClick={() => handleClickTab(tab)}
                      className={cn(
                        "h-9 flex w-full items-center justify-start gap-2 rounded-lg p-2 text-sm text-neutral-600 focus:outline-none",
                        current === tab ? "bg-neutral-200" : "hover:bg-neutral-100",
                      )}
                    >
                      {tab === "general"
                        ? <SettingsIcon className="h-4 w-4" />
                        : tab === "profile"
                        ? <UserIcon className="h-4 w-4" />
                        : tab === "ai"
                        ? <SparklesIcon className="h-4 w-4" />
                        : tab === "calendar"
                        ? <CalendarIcon className="h-4 w-4" />
                        : tab === "notifications"
                        ? <BellIcon className="h-4 w-4" />
                        : tab === "templates"
                        ? <FileTextIcon className="h-4 w-4" />
                        : tab === "extensions"
                        ? <BlocksIcon className="h-4 w-4" />
                        : tab === "team"
                        ? <UsersIcon className="h-4 w-4" />
                        : tab === "billing"
                        ? <CreditCardIcon className="h-4 w-4" />
                        : null}
                      <span className="capitalize">
                        <Trans>{tab}</Trans>
                      </span>
                      {tab === "team" && (
                        <div className="ml-auto text-xs">
                          <Trans>Coming Soon</Trans>
                        </div>
                      )}
                      {tab === "billing" && (
                        <div className="ml-auto text-xs">
                          <Trans>Coming Soon</Trans>
                        </div>
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
        </nav>
      </div>

      <div className="flex-1 flex h-screen w-screen flex-col overflow-hidden">
        <header className="flex w-full flex-col">
          <div data-tauri-drag-region className="relative h-11 w-full flex items-center justify-center">
            <h1 className="text-md font-semibold capitalize" data-tauri-drag-region>
              <Trans>{current}</Trans>
            </h1>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {current === "general" && <General />}
          {current === "profile" && <Profile />}
          {current === "ai" && <LocalAI />}
          {current === "calendar" && <Calendar />}
          {current === "notifications" && <Notifications />}
          {current === "templates" && <TemplatesWrapper selectedTemplateId={selectedTemplate} />}
          {current === "extensions" && <ExtensionsWrapper selectedExtension={selectedExtension} />}
          {current === "team" && <Team />}
          {current === "billing" && <Billing />}
        </div>
      </div>
    </div>
  );
}

// Wrapper components for views that require props
function TemplatesWrapper({ selectedTemplateId }: { selectedTemplateId: string | null }) {
  // Create a default empty template with all required properties
  const [template, setTemplate] = useState({
    id: selectedTemplateId || "",
    title: "",
    description: "",
    sections: [],
    tags: [],
    user_id: "",
  });

  const handleTemplateUpdate = (updatedTemplate: any) => {
    setTemplate(updatedTemplate);
  };

  return (
    <TemplateEditor
      disabled={false}
      template={template}
      onTemplateUpdate={handleTemplateUpdate}
    />
  );
}

function ExtensionsWrapper({ selectedExtension }: { selectedExtension: ExtensionDefinition | null }) {
  const [extension, setExtension] = useState<ExtensionDefinition | null>(selectedExtension);

  return (
    <Extensions
      selectedExtension={extension}
      onExtensionSelect={setExtension}
    />
  );
}
