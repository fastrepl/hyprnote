import { Trans } from "@lingui/react/macro";
import { FileTextIcon, SearchIcon } from "lucide-react";

import { type Template } from "@hypr/plugin-db";
import { cn } from "@hypr/ui/lib/utils";

interface TemplatesSidebarProps {
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  customTemplates: Template[];
  builtinTemplates: Template[];
  selectedTemplate: string | null;
  onTemplateSelect: (templateId: string) => void;
}

export function TemplatesSidebar({
  searchQuery,
  onSearchChange,
  customTemplates,
  builtinTemplates,
  selectedTemplate,
  onTemplateSelect,
}: TemplatesSidebarProps) {
  return (
    <>
      <div className="p-2">
        <div className="relative flex items-center">
          <SearchIcon className="absolute left-2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search templates..."
            className="w-full rounded-md border border-neutral-200 bg-white py-1 pl-8 pr-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
            value={searchQuery}
            onChange={onSearchChange}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 p-2">
          {customTemplates.length > 0 && (
            <div>
              <h3 className="mb-1 px-2 text-xs font-medium uppercase text-neutral-500">
                <Trans>Your Templates</Trans>
              </h3>
              <div className="space-y-1">
                {customTemplates.map((template) => (
                  <button
                    key={template.id}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg p-2 text-sm text-neutral-600 hover:bg-neutral-100",
                      selectedTemplate === template.id && "bg-neutral-100 font-medium",
                    )}
                    onClick={() => onTemplateSelect(template.id)}
                  >
                    <FileTextIcon className="h-4 w-4" />
                    <span>{template.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {builtinTemplates.length > 0 && (
            <div>
              <h3 className="mb-1 px-2 text-xs font-medium uppercase text-neutral-500">
                <Trans>Built-in Templates</Trans>
              </h3>
              <div className="space-y-1">
                {builtinTemplates.map((template) => (
                  <button
                    key={template.id}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg p-2 text-sm text-neutral-600 hover:bg-neutral-100",
                      selectedTemplate === template.id && "bg-neutral-100 font-medium",
                    )}
                    onClick={() => onTemplateSelect(template.id)}
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
  );
}
