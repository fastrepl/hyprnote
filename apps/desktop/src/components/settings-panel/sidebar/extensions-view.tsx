import { ChevronLeftIcon } from "lucide-react";
import { ExtensionList } from "../components/extension-list";
import { type NavNames } from "../types";
import { data } from "../constants";
import { cn } from "@hypr/ui/lib/utils";

interface Extension {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  enabled: boolean;
}

interface ExtensionsViewProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  setActive: (name: NavNames) => void;
}

export function ExtensionsView({
  searchQuery,
  onSearchChange,
  setActive,
}: ExtensionsViewProps) {
  // TODO: Replace with actual extension data and handlers
  const installedExtensions: Extension[] = [];
  const marketplaceExtensions: Extension[] = [];
  const selectedExtension: Extension | null = null;
  const handleExtensionSelect = (extension: Extension) => {
    // TODO: Implement extension selection
    console.log("Selected extension:", extension);
  };

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex-1 overflow-auto">
        <header className="border-b p-2">
          <button
            onClick={() => setActive(data.nav[0].name)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg p-2 text-sm",
              "text-neutral-600 ",
              "hover:bg-neutral-100 ",
            )}
          >
            <ChevronLeftIcon className="h-4 w-4" />
            <span>Back to Settings</span>
          </button>
        </header>

        <ExtensionList
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          installedExtensions={installedExtensions}
          marketplaceExtensions={marketplaceExtensions}
          onExtensionSelect={handleExtensionSelect}
          selectedExtension={selectedExtension}
        />
      </div>
    </div>
  );
}
