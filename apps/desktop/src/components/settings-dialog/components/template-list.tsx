import { type ReactNode } from "react";
import { SearchIcon, ZapIcon, TagIcon, HeartIcon } from "lucide-react";
import type { Template } from "@/types";
import { cn } from "@hypr/ui/lib/utils";

interface TemplateListProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  customTemplates: Template[];
  builtinTemplates: Template[];
  onTemplateSelect: (template: Template) => void;
  selectedTemplate: Template | null;
}

export function TemplateList({
  searchQuery,
  onSearchChange,
  customTemplates,
  builtinTemplates,
  onTemplateSelect,
  selectedTemplate,
}: TemplateListProps) {
  const filterTemplate = (template: Template, query: string) => {
    const searchLower = query.toLowerCase();
    return (
      template.title?.toLowerCase().includes(searchLower) ||
      template.description?.toLowerCase().includes(searchLower) ||
      template.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  };

  return (
    <>
      <div className="sticky top-0 bg-background p-2">
        <div className="relative">
          <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            placeholder="Search templates..."
            className="w-full bg-transparent px-8 py-2 text-sm text-foreground placeholder:text-neutral-400 focus:outline-none"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {customTemplates && customTemplates.length > 0 && (
        <section className="p-2">
          <h3 className="flex items-center gap-2 p-2 text-sm font-semibold text-neutral-700">
            <HeartIcon className="h-4 w-4" />
            My Templates
          </h3>
          <nav className="mt-2 rounded-md bg-neutral-50 p-2">
            <ul>
              {customTemplates
                .filter((template) => filterTemplate(template, searchQuery))
                .map((template) => (
                  <li key={template.id}>
                    <button
                      onClick={() => onTemplateSelect(template)}
                      className={cn(
                        "flex w-full flex-col gap-1 rounded-lg p-2 text-sm",
                        "text-neutral-600",
                        "hover:bg-neutral-100",
                        selectedTemplate?.id === template.id
                          ? "bg-neutral-200 font-bold text-neutral-700"
                          : "",
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
          Official Templates
        </h3>
        <nav className="mt-2 rounded-md bg-neutral-50 p-2">
          <ul>
            {builtinTemplates
              .filter((template) => filterTemplate(template, searchQuery))
              .map((template) => (
                <li key={template.id}>
                  <button
                    onClick={() => onTemplateSelect(template)}
                    className={cn(
                      "flex w-full flex-col gap-1 rounded-lg p-2 text-sm",
                      "text-neutral-600",
                      "hover:bg-neutral-100",
                      selectedTemplate?.id === template.id
                        ? "bg-neutral-200 font-bold text-neutral-700"
                        : "",
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
    </>
  );
}

interface TemplateContentProps {
  children: ReactNode;
}

export function TemplateContent({ children }: TemplateContentProps) {
  return <div className="flex-1 overflow-y-auto p-6">{children}</div>;
}
