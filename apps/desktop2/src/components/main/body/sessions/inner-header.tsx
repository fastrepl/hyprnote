import { useEffect } from "react";

import { cn } from "@hypr/ui/lib/utils";
import { type Tab, useTabs } from "../../../../store/zustand/tabs";

interface TabHeaderProps {
  tab: Tab;
  onVisibilityChange?: (isVisible: boolean) => void;
  isCurrentlyRecording: boolean;
  shouldShowTab: boolean;
  shouldShowEnhancedTab: boolean;
}

export const InnerHeader = ({
  tab,
  onVisibilityChange,
  isCurrentlyRecording,
  shouldShowTab,
  shouldShowEnhancedTab,
}: TabHeaderProps) => {
  const { updateSessionTabState } = useTabs();

  const currentTab = tab.type === "sessions" ? (tab.state.editor ?? "raw") : "raw";

  const handleTabChange = (view: "raw" | "enhanced" | "transcript") => {
    updateSessionTabState(tab, { editor: view });
  };

  // set default tab to 'raw' for blank notes (no meeting session)
  useEffect(() => {
    if (!shouldShowTab && tab.type === "sessions") {
      updateSessionTabState(tab, { editor: "raw" });
    }
  }, [shouldShowTab, tab, updateSessionTabState]);

  // notify parent when visibility changes
  useEffect(() => {
    if (onVisibilityChange) {
      onVisibilityChange(shouldShowTab ?? false);
    }
  }, [shouldShowTab, onVisibilityChange]);

  // don't render tabs at all for blank notes (no meeting session)
  if (!shouldShowTab) {
    return null;
  }

  return (
    <div className="relative">
      {/* Tab container */}
      <div className="bg-white">
        <div className="flex">
          <div className="flex border-b border-neutral-100 w-full">
            {/* Raw Note Tab */}

            {/* Enhanced Note Tab - show when session ended OR transcript exists OR enhanced memo exists */}
            {shouldShowEnhancedTab && (
              <button
                onClick={() => handleTabChange("enhanced")}
                className={cn(
                  "relative px-2 py-2 text-xs pl-1 font-medium transition-all duration-200 border-b-2 -mb-px flex items-center gap-1.5",
                  currentTab === "enhanced"
                    ? "text-neutral-900 border-neutral-900"
                    : "text-neutral-600 border-transparent hover:text-neutral-800",
                )}
              >
                Summary
              </button>
            )}

            <button
              onClick={() => handleTabChange("raw")}
              className={cn(
                "relative py-2 text-xs font-medium transition-all duration-200 border-b-2 -mb-px flex items-center gap-1.5",
                shouldShowEnhancedTab ? "pl-3 px-4" : "pl-1 px-2",
                currentTab === "raw"
                  ? "text-neutral-900 border-neutral-900"
                  : "text-neutral-600 border-transparent hover:text-neutral-800",
              )}
            >
              Memos
            </button>

            {/* Transcript Tab - always show */}
            <button
              onClick={() => handleTabChange("transcript")}
              className={cn(
                "relative px-4 py-2 text-xs pl-3 font-medium transition-all duration-200 border-b-2 -mb-px flex items-center gap-1.5",
                currentTab === "transcript"
                  ? "text-neutral-900 border-neutral-900"
                  : "text-neutral-600 border-transparent hover:text-neutral-800",
              )}
            >
              Transcript
              {isCurrentlyRecording && (
                <div className="relative h-2 w-2">
                  <div className="absolute inset-0 rounded-full bg-red-500/30"></div>
                  <div className="absolute inset-0 rounded-full bg-red-500 animate-ping"></div>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
