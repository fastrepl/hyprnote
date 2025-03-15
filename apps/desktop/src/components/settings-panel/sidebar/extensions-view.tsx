import type { ExtensionDefinition } from "@hypr/plugin-db";
import { ChevronLeftIcon } from "lucide-react";
import { memo, useCallback } from "react";
import { ExtensionList } from "../components/extension-list";
import { data } from "../constants";
import type { NavNames } from "../types";

import calculatorConfig from "@hypr/extension-calculator/config.json";
import clockConfig from "@hypr/extension-clock/config.json";
import dinoGameConfig from "@hypr/extension-dino-game/config.json";
import summaryConfig from "@hypr/extension-summary/config.json";
import timerConfig from "@hypr/extension-timer/config.json";
import transcriptConfig from "@hypr/extension-transcript/config.json";

export const EXTENSION_CONFIGS: ExtensionDefinition[] = [
  transcriptConfig,
  summaryConfig,
  timerConfig,
  calculatorConfig,
  clockConfig,
  dinoGameConfig,
];

interface ExtensionsViewProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  setActive: (name: NavNames) => void;
  selectedExtension: ExtensionDefinition | null;
  onExtensionSelect: (extension: ExtensionDefinition | null) => void;
}

// Memoize the component to prevent unnecessary re-renders
export const ExtensionsView = memo(function ExtensionsView({
  searchQuery,
  onSearchChange,
  setActive,
  selectedExtension,
  onExtensionSelect,
}: ExtensionsViewProps) {
  // Memoize the handler to prevent recreation on every render
  const handleExtensionSelect = useCallback((extension: ExtensionDefinition) => {
    onExtensionSelect(extension);
  }, [onExtensionSelect]);

  // Memoize the back button handler
  const handleBackClick = useCallback(() => {
    setActive(data.nav[0].name);
  }, [setActive]);

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b p-2 bg-white">
        <button
          onClick={handleBackClick}
          className="flex w-full items-center gap-2 rounded-lg p-2 text-sm text-neutral-600 hover:bg-neutral-100"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          <span>Back to Settings</span>
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-hidden">
        <ExtensionList
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          extensions={EXTENSION_CONFIGS}
          onExtensionSelect={handleExtensionSelect}
          selectedExtension={selectedExtension}
        />
      </div>
    </div>
  );
});
