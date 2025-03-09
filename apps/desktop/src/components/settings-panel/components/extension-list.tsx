import { type ReactNode } from "react";
import { SearchIcon, PackageIcon } from "lucide-react";
import { cn } from "@hypr/ui/lib/utils";

interface Extension {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  enabled: boolean;
}

interface ExtensionListProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  installedExtensions: Extension[];
  marketplaceExtensions: Extension[];
  onExtensionSelect: (extension: Extension) => void;
  selectedExtension: Extension | null;
}

export function ExtensionList({
  searchQuery,
  onSearchChange,
  installedExtensions,
  marketplaceExtensions,
  onExtensionSelect,
  selectedExtension,
}: ExtensionListProps) {
  const filterExtension = (extension: Extension, query: string) => {
    const searchLower = query.toLowerCase();
    return (
      extension.name.toLowerCase().includes(searchLower) ||
      extension.description.toLowerCase().includes(searchLower) ||
      extension.author.toLowerCase().includes(searchLower)
    );
  };

  return (
    <>
      <div className="sticky top-0 bg-background dark:bg-neutral-600 p-2">
        <div className="relative">
          <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-neutral-400 dark:text-neutral-300" />
          <input
            placeholder="Search extensions..."
            className="w-full bg-transparent px-8 py-2 text-sm text-foreground dark:caret-neutral-300 dark:text-neutral-300 focus:outline-none"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {installedExtensions && installedExtensions.length > 0 && (
        <section className="p-2">
          <h3 className="flex items-center gap-2 p-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            <PackageIcon className="h-4 w-4" />
            Installed Extensions
          </h3>
          <div className="space-y-1">
            {installedExtensions
              .filter((ext) => filterExtension(ext, searchQuery))
              .map((extension) => (
                <button
                  key={extension.id}
                  onClick={() => onExtensionSelect(extension)}
                  className={cn(
                    "flex w-full flex-col gap-1 rounded-lg p-2 text-left",
                    "hover:bg-neutral-100 dark:hover:bg-neutral-600",
                    selectedExtension?.id === extension.id &&
                      "bg-neutral-100 dark:bg-neutral-600",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{extension.name}</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-300">
                      v{extension.version}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300">
                    {extension.description}
                  </p>
                  <span className="text-xs text-neutral-500 dark:text-neutral-300">
                    by {extension.author}
                  </span>
                </button>
              ))}
          </div>
        </section>
      )}

      {marketplaceExtensions && marketplaceExtensions.length > 0 && (
        <section className="p-2">
          <h3 className="flex items-center gap-2 p-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            <PackageIcon className="h-4 w-4" />
            Available Extensions
          </h3>
          <div className="space-y-1">
            {marketplaceExtensions
              .filter((ext) => filterExtension(ext, searchQuery))
              .map((extension) => (
                <button
                  key={extension.id}
                  onClick={() => onExtensionSelect(extension)}
                  className={cn(
                    "flex w-full flex-col gap-1 rounded-lg p-2 text-left",
                    "hover:bg-neutral-100 dark:hover:bg-neutral-600",
                    selectedExtension?.id === extension.id &&
                      "bg-neutral-100 dark:bg-neutral-600",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{extension.name}</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-300">
                      v{extension.version}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300">
                    {extension.description}
                  </p>
                  <span className="text-xs text-neutral-500 dark:text-neutral-300">
                    by {extension.author}
                  </span>
                </button>
              ))}
          </div>
        </section>
      )}
    </>
  );
}

interface ExtensionContentProps {
  children: ReactNode;
}

export function ExtensionContent({ children }: ExtensionContentProps) {
  return <div className="p-2">{children}</div>;
}
