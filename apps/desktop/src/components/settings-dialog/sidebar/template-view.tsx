import { type Template } from "@/types";
import { ChevronLeftIcon, FilePlusIcon } from "lucide-react";
import { TemplateList } from "../components/template-list";
import { type NavNames } from "../types";
import { data } from "../constants";
import { cn } from "@hypr/ui/lib/utils";

export interface TemplateViewProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  customTemplates: Template[];
  builtinTemplates: Template[];
  templateIndex: number;
  onTemplateSelect: (template: Template, index: number) => void;
  setActive: (name: NavNames) => void;
}

export function TemplateView({
  searchQuery,
  onSearchChange,
  customTemplates,
  builtinTemplates,
  templateIndex,
  onTemplateSelect,
  setActive,
}: TemplateViewProps) {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex-1 overflow-auto">
        <header className="border-b p-2">
          <button
            onClick={() => setActive(data.nav[0].name)}
            className={cn(
              "flex w-full flex-row items-center gap-2 rounded-md p-2",
              "text-sm font-medium text-muted-foreground",
              "hover:bg-muted/50 hover:text-foreground",
            )}
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
          selectedIndex={templateIndex}
          onTemplateSelect={onTemplateSelect}
        />
      </div>

      <footer className="mt-auto border-t p-2">
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-md p-2",
            "text-sm font-medium",
            "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            "justify-center md:justify-start",
          )}
          onClick={() => {
            /* TODO: Create template handler */
          }}
        >
          <FilePlusIcon className="h-4 w-4" />
          <span className="hidden md:inline-block">Create Template</span>
        </button>
      </footer>
    </div>
  );
}
