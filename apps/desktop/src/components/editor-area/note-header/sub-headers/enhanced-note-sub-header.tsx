import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon, RefreshCwIcon, PlusIcon } from "lucide-react";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";

import { TemplateService } from "@/utils/template-service";
import { commands as windowsCommands } from "@hypr/plugin-windows";
// import { useShareLogic } from "../share-button-header";

interface EnhancedNoteSubHeaderProps {
  sessionId: string;
  onEnhance?: (params: { triggerType: "manual" | "template"; templateId?: string | null }) => void;
  isEnhancing?: boolean;
  progress?: number;
  showProgress?: boolean;
}

export function EnhancedNoteSubHeader({ 
  sessionId, 
  onEnhance, 
  isEnhancing,
  progress = 0,
  showProgress = false 
}: EnhancedNoteSubHeaderProps) {
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  
  // Share functionality (currently commented out)
  // const { hasEnhancedNote } = useShareLogic();

  const templatesQuery = useQuery({
    queryKey: ["templates"],
    queryFn: () =>
      TemplateService.getAllTemplates().then((templates) =>
        templates.map((template) => {
          const title = template.title || "Untitled";
          const truncatedTitle = title.length > 30 ? title.substring(0, 30) + "..." : title;
          return { id: template.id, title: truncatedTitle, fullTitle: template.title || "" };
        })
      ),
    refetchOnWindowFocus: true,
  });

  const handleRegenerateDefault = () => {
    if (onEnhance) {
      onEnhance({ triggerType: "manual" });
    }
  };

  const handleRegenerateWithTemplate = (templateId: string) => {
    if (onEnhance) {
      const actualTemplateId = templateId === "auto" ? null : templateId;
      onEnhance({ triggerType: "template", templateId: actualTemplateId });
    }
    setIsTemplateDropdownOpen(false);
  };

  const handleAddTemplate = async () => {
    setIsTemplateDropdownOpen(false);
    try {
      await windowsCommands.windowShow({ type: "settings" });
      await windowsCommands.windowNavigate({ type: "settings" }, "/app/settings?tab=templates");
    } catch (error) {
      console.error("Failed to open settings/templates:", error);
    }
  };

  // Commented out share functionality
  // const handleShareOpenChange = (newOpen: boolean) => {
  //   setIsShareDropdownOpen(newOpen);
  //   if (hasEnhancedNote) {
  //     handleOpenStateChange(newOpen);
  //   }
  // };

  const shouldShowProgress = showProgress && progress < 1.0;

  // Helper function to extract emoji and clean name (copied from floating-button.tsx)
  const extractEmojiAndName = (title: string) => {
    if (!title) {
      return {
        emoji: "📄",
        name: "Untitled",
      };
    }
    const emojiMatch = title.match(/^(\p{Emoji})\s*/u);
    if (emojiMatch) {
      return {
        emoji: emojiMatch[1],
        name: title.replace(/^(\p{Emoji})\s*/u, "").trim(),
      };
    }

    // Fallback emoji based on keywords if no emoji in title
    const lowercaseTitle = title.toLowerCase();
    let fallbackEmoji = "📄";
    if (lowercaseTitle.includes("meeting")) {
      fallbackEmoji = "💼";
    }
    if (lowercaseTitle.includes("interview")) {
      fallbackEmoji = "👔";
    }
    if (lowercaseTitle.includes("standup")) {
      fallbackEmoji = "☀️";
    }
    if (lowercaseTitle.includes("review")) {
      fallbackEmoji = "📝";
    }

    return {
      emoji: fallbackEmoji,
      name: title,
    };
  };

  return (
    <div className="flex items-center justify-start px-8 py-2">
      {/* Regenerate button */}
      <div className="flex items-center gap-2">
        {/* Share button 
        <Popover open={isShareDropdownOpen} onOpenChange={handleShareOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-6 px-3 hover:bg-neutral-100"
            >
              <Share2 size={14} className="mr-1.5" />
              Share
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 p-3 focus:outline-none focus:ring-0 focus:ring-offset-0"
            align="end"
            sideOffset={4}
          >
            <SharePopoverContent />
          </PopoverContent>
        </Popover>
        */}

        {/* Regenerate button with template dropdown */}
        <Popover open={isTemplateDropdownOpen} onOpenChange={setIsTemplateDropdownOpen}>
          <div className="flex -space-x-px">
            {/* Main regenerate button */}
            {/*
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerateDefault}
              disabled={isEnhancing}
              className="rounded-r-none text-xs h-8 px-3 hover:bg-neutral-100 disabled:opacity-50"
            >
              {isEnhancing ? (
                <>
                  <Spinner className="mr-1.5 w-3 h-3" />
                  Generating...
                  {shouldShowProgress && (
                    <span className="ml-2 text-xs font-mono">
                      {Math.round(progress * 100)}%
                    </span>
                  )}
                </>
              ) : (
                <>
                  <RefreshCwIcon size={14} className="mr-1.5" />
                  Regenerate
                </>
              )}
            </Button>
            

            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isEnhancing}
                className="rounded-l-none px-1.5 h-8 border-l-0 hover:bg-neutral-100 disabled:opacity-50"
              >
                <ChevronDownIcon size={14} />
              </Button>
            </PopoverTrigger>
            */}
          </div>

          <PopoverContent
            side="bottom"
            align="start"
            className="w-64 p-0 shadow-[0_4px_8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.03)]"
            sideOffset={4}
          >
            <div className="max-h-48 overflow-y-auto p-2 space-y-1 bg-white rounded-lg">
              {/* Add Template option */}
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-neutral-100 cursor-pointer text-xs text-neutral-400 hover:text-neutral-600 transition-all"
                onClick={handleAddTemplate}
              >
                <PlusIcon className="w-3 h-3" />
                <span className="truncate">Add Template</span>
              </div>

              {/* Separator */}
              <div className="my-1 border-t border-neutral-200"></div>

              {/* Default option */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-100 cursor-pointer text-sm transition-all"
                onClick={() => handleRegenerateWithTemplate("auto")}
              >
                <span className="text-sm">⚡</span>
                <span className="truncate">No Template (Default)</span>
              </div>

              {/* Custom templates */}
              {templatesQuery.data && templatesQuery.data.length > 0 && (
                <>
                  <div className="my-1 border-t border-neutral-200"></div>
                  {templatesQuery.data.map((template) => {
                    const { emoji, name } = extractEmojiAndName(template.fullTitle);

                    return (
                      <div
                        key={template.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-100 cursor-pointer text-sm transition-all"
                        onClick={() => handleRegenerateWithTemplate(template.id)}
                        title={template.fullTitle} // Show full title on hover
                      >
                        <span className="text-sm">{emoji}</span>
                        <span className="truncate">{name}</span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
