import { BlocksIcon, SearchIcon } from "lucide-react";

import { type ExtensionDefinition } from "@hypr/plugin-db";
import { cn } from "@hypr/ui/lib/utils";

interface ExtensionsSidebarProps {
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  extensions: ExtensionDefinition[];
  selectedExtension: ExtensionDefinition | null;
  onExtensionSelect: (extension: ExtensionDefinition) => void;
}

export function ExtensionsSidebar({
  searchQuery,
  onSearchChange,
  extensions,
  selectedExtension,
  onExtensionSelect,
}: ExtensionsSidebarProps) {
  return (
    <>
      <div className="p-2">
        <div className="relative flex items-center">
          <SearchIcon className="absolute left-2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search extensions..."
            className="w-full rounded-md border border-neutral-200 bg-white py-1 pl-8 pr-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
            value={searchQuery}
            onChange={onSearchChange}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-1 p-2">
          {extensions.map((extension) => (
            <button
              key={extension.id}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg p-2 text-sm text-neutral-600 hover:bg-neutral-100",
                selectedExtension?.id === extension.id && "bg-neutral-100 font-medium",
              )}
              onClick={() => onExtensionSelect(extension)}
              disabled={!extension.implemented}
            >
              <BlocksIcon className="h-4 w-4" />
              <div className="flex flex-1 items-center justify-between">
                <span>{extension.title}</span>
                {!extension.implemented && <span className="text-xs text-neutral-400">Coming Soon</span>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
