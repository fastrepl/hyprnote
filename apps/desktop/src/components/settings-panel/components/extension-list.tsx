import type { ExtensionDefinition } from "@hypr/plugin-db";
import { cn } from "@hypr/ui/lib/utils";
import { useLingui } from "@lingui/react/macro";
import { SearchIcon } from "lucide-react";
import { type ReactNode, useCallback, useMemo } from "react";

interface ExtensionListProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  extensions: ExtensionDefinition[];
  onExtensionSelect: (extension: ExtensionDefinition) => void;
  selectedExtension: ExtensionDefinition | null;
}

export function ExtensionList({
  searchQuery,
  onSearchChange,
  extensions,
  onExtensionSelect,
  selectedExtension,
}: ExtensionListProps) {
  const { t } = useLingui();

  const filterExtension = useCallback((extension: ExtensionDefinition, query: string) => {
    const searchLower = query.toLowerCase();
    return (
      extension.implemented
      && (extension.title.toLowerCase().includes(searchLower)
        || extension.description.toLowerCase().includes(searchLower)
        || extension.tags.some(tag => tag.toLowerCase().includes(searchLower)))
    );
  }, []);

  const implementedExtensions = useMemo(() => extensions.filter(ext => ext.implemented), [extensions]);

  const filteredExtensions = useMemo(() => implementedExtensions.filter(ext => filterExtension(ext, searchQuery)), [
    implementedExtensions,
    filterExtension,
    searchQuery,
  ]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  }, [onSearchChange]);

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="bg-background p-2">
        <div className="relative">
          <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            placeholder={t`Search extensions...`}
            className="w-full rounded-md border border-neutral-200 bg-white px-8 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-300"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      <section className="flex-1 p-2 overflow-hidden">
        <div className="h-full overflow-y-auto scrollbar-none">
          {filteredExtensions.map((extension) => (
            <button
              key={extension.id}
              onClick={() => onExtensionSelect(extension)}
              className={cn(
                "flex w-full flex-col rounded-lg p-2 text-left",
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
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

interface ExtensionContentProps {
  children: ReactNode;
}

export function ExtensionContent({ children }: ExtensionContentProps) {
  return <div className="p-2">{children}</div>;
}
