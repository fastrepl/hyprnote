import { ChevronLeftIcon, FilePlusIcon } from "lucide-react";

import { TemplateList } from "../components/template-list";
import { data } from "../constants";
import { type NavNames } from "../types";

import { useHypr } from "@/contexts";
import { type Template } from "@hypr/plugin-db";

export interface TemplateViewProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  customTemplates: Template[];
  builtinTemplates: Template[];
  onTemplateSelect: (template: Template) => void;
  onCreateTemplate: (template: Template) => void;
  setActive: (name: NavNames) => void;
  selectedTemplate: Template | null;
}

export function TemplateView({
  searchQuery,
  onSearchChange,
  customTemplates,
  builtinTemplates,
  onTemplateSelect,
  onCreateTemplate,
  setActive,
  selectedTemplate,
}: TemplateViewProps) {
  const { userId } = useHypr();

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden">
        <header className="border-b p-2">
          <button
            onClick={() => setActive(data.nav[0].name)}
            className="flex w-full items-center gap-2 rounded-lg p-2 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            <span>Back to Settings</span>
          </button>
        </header>

        <TemplateList
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          customTemplates={customTemplates}
          builtinTemplates={builtinTemplates}
          onTemplateSelect={onTemplateSelect}
          selectedTemplate={selectedTemplate}
        />
      </div>

      <footer className="mt-auto border-t p-2 hidden md:block">
        <button
          className="flex w-full items-center gap-2 rounded-lg p-2 text-sm text-neutral-600 hover:bg-neutral-100"
          onClick={() => {
            const newTemplate: Template = {
              id: crypto.randomUUID(),
              user_id: userId,
              title: "Untitled Template",
              description: "",
              tags: [],
              sections: [],
            };
            onCreateTemplate(newTemplate);
            onTemplateSelect(newTemplate);
            setActive("Templates");
          }}
        >
          <FilePlusIcon className="h-4 w-4" />
          Create Template
        </button>
      </footer>
    </div>
  );
}
