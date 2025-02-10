import { type ReactNode } from "react";
import { BookmarkIcon, SearchIcon, ZapIcon } from "lucide-react";
import type { Template } from "@/types";
import { cn } from "@hypr/ui/lib/utils";

interface TemplateListProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  customTemplates: Template[];
  builtinTemplates: Template[];
  selectedIndex: number;
  onTemplateSelect: (template: Template, index: number) => void;
  selectedTemplate: Template | null;
}

export function TemplateList({
  searchQuery,
  onSearchChange,
  customTemplates,
  builtinTemplates,
  selectedIndex,
  onTemplateSelect,
  selectedTemplate,
}: TemplateListProps) {
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
            <BookmarkIcon className="h-4 w-4" />
            My Templates
          </h3>
          <nav className="mt-2 rounded-md bg-neutral-50 p-2">
            <ul>
              {customTemplates
                .filter((template) =>
                  template?.title
                    ?.toLowerCase()
                    .includes(searchQuery.toLowerCase()),
                )
                .map((template, index) => (
                  <li key={template.id || index}>
                    <button
                      key={template.id}
                      onClick={() => onTemplateSelect(template, index)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg p-2 text-sm",
                        "text-neutral-600",
                        "hover:bg-neutral-100",
                        selectedTemplate?.id === template.id &&
                          "bg-neutral-200 font-bold text-neutral-700",
                      )}
                    >
                      {template.title || "Untitled Template"}
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
              .filter((template) =>
                template?.title
                  ?.toLowerCase()
                  .includes(searchQuery.toLowerCase()),
              )
              .map((template, index) => (
                <li key={template.id || index}>
                  <button
                    key={template.id}
                    onClick={() => onTemplateSelect(template, index)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg p-2 text-sm",
                      "text-neutral-600",
                      "hover:bg-neutral-100",
                      selectedTemplate?.id === template.id &&
                        "bg-neutral-200 font-bold text-neutral-700",
                    )}
                  >
                    {template.title || "Untitled Template"}
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
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
