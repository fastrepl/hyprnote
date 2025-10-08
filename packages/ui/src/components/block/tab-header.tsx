import { cn } from "@hypr/ui/lib/utils";
import { useEffect } from "react";

interface TabHeaderProps {
  isEnhancing?: boolean;
  onVisibilityChange?: (isVisible: boolean) => void;
  currentTab: "raw" | "enhanced" | "transcript";
  onTabChange: (tab: "raw" | "enhanced" | "transcript") => void;
  isCurrentlyRecording: boolean;
  shouldShowTab: boolean;
  shouldShowEnhancedTab: boolean;
}

export const TabHeader = ({
  isEnhancing,
  onVisibilityChange,
  onTabChange,
  currentTab,
  isCurrentlyRecording,
  shouldShowTab,
  shouldShowEnhancedTab,
}: TabHeaderProps) => {
  useEffect(() => {
    // when enhancement starts (immediately after recording ends) -> switch to enhanced note
    if (isEnhancing) {
      onTabChange("enhanced");
    }
  }, [isEnhancing]);

  // set default tab to 'raw' for blank notes (no meeting session)
  useEffect(() => {
    if (!shouldShowTab) {
      onTabChange("raw");
    }
  }, [shouldShowTab, onTabChange]);

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
        <div className="flex px-8">
          <div className="flex border-b border-neutral-100 w-full">
            {/* Raw Note Tab */}

            {/* Enhanced Note Tab - show when session ended OR transcript exists OR enhanced memo exists */}
            {shouldShowEnhancedTab && (
              <button
                onClick={() => onTabChange("enhanced")}
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
              onClick={() => onTabChange("raw")}
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
              onClick={() => onTabChange("transcript")}
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
