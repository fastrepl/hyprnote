import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession, useOngoingSession } from "@hypr/utils/contexts";
import { cn } from "@hypr/ui/lib/utils";
import { FileTextIcon, SparklesIcon, MicIcon, ChevronDownIcon, RefreshCwIcon, PlusIcon } from "lucide-react";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { TemplateService } from "@/utils/template-service";
import { commands as windowsCommands } from "@hypr/plugin-windows";

interface TabHeaderProps {
  sessionId: string;
  onEnhance?: (params: { triggerType: "manual" | "template"; templateId?: string | null }) => void;
  isEnhancing?: boolean;
  progress?: number;
  showProgress?: boolean;
}

export function TabHeader({ sessionId, onEnhance, isEnhancing, progress = 0, showProgress = false }: TabHeaderProps) {
  const [activeTab, setActiveTab] = useSession(sessionId, (s) => [
    s.activeTab,
    s.setActiveTab,
  ]);
  const session = useSession(sessionId, (s) => s.session);
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);

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

  const ongoingSessionStatus = useOngoingSession((s) => s.status);
  const ongoingSessionId = useOngoingSession((s) => s.sessionId);

  // Template functionality handlers
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

  // Helper function to extract emoji and clean name
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

  const shouldShowProgress = showProgress && progress < 1.0;

  // Check the three conditions as requested
  const hasTranscript = session.words && session.words.length > 0;
  const isSessionInactive = ongoingSessionStatus === "inactive" || session.id !== ongoingSessionId;
  const hasEnhancedMemo = !!session?.enhanced_memo_html;
  
  // Show Enhanced Note tab when: session ended OR transcript exists OR enhanced memo exists
  const canEnhanceTranscript = hasTranscript && isSessionInactive;
  const shouldShowEnhancedTab = hasEnhancedMemo || canEnhanceTranscript;

  // Automatic tab switching logic following existing conventions
  useEffect(() => {
    // When recording starts for this session -> switch to transcript
    if (ongoingSessionStatus === "running_active" && ongoingSessionId === sessionId) {
      setActiveTab('transcript');
    }
  }, [ongoingSessionStatus, ongoingSessionId, sessionId, setActiveTab]);

  useEffect(() => {
    // When recording ends and session has transcript -> switch to enhanced note
    if (ongoingSessionStatus === "inactive" && hasTranscript && shouldShowEnhancedTab) {
      setActiveTab('enhanced');
    }
  }, [ongoingSessionStatus, hasTranscript, shouldShowEnhancedTab, setActiveTab]);

  const handleTabClick = (tab: 'raw' | 'enhanced' | 'transcript') => {
    setActiveTab(tab);
  };

  return (
    <div className="relative">
      {/* Tab container */}
      <div className="bg-white">
        <div className="flex px-8">
          {/* Raw Note Tab */}
          <button
            onClick={() => handleTabClick('raw')}
            className={cn(
              "relative px-4 py-2 text-xs font-medium transition-all duration-200 border-b-2 -mb-px flex items-center gap-1.5",
              activeTab === 'raw'
                ? "text-neutral-900 border-neutral-900"
                : "text-neutral-600 border-transparent hover:text-neutral-800"
            )}
          >
            <FileTextIcon size={14} />
            Memos
          </button>

          {/* Enhanced Note Tab - show when session ended OR transcript exists OR enhanced memo exists */}
          {shouldShowEnhancedTab && (
            <button
              onClick={() => handleTabClick('enhanced')}
              className={cn(
                "relative px-4 py-2 text-xs font-medium transition-all duration-200 border-b-2 -mb-px flex items-center gap-1.5",
                activeTab === 'enhanced'
                  ? "text-neutral-900 border-neutral-900"
                  : "text-neutral-600 border-transparent hover:text-neutral-800"
              )}
            >
              <SparklesIcon size={14} />
              Summary
              
              {/* Regenerate button - only visible when Summary tab is active */}
              {activeTab === 'enhanced' && (
                <div className="ml-2 flex items-center" onClick={(e) => e.stopPropagation()}>
                  <Popover open={isTemplateDropdownOpen} onOpenChange={setIsTemplateDropdownOpen}>
                    <div className="flex -space-x-px">
                      {/* Main regenerate button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRegenerateDefault}
                        disabled={isEnhancing}
                        className="rounded-r-none text-xs h-5 px-1.5 hover:bg-neutral-100 disabled:opacity-50 border-neutral-300"
                      >
                        {isEnhancing ? (
                          <>
                            <Spinner className="mr-1 w-2.5 h-2.5" />
                            <span className="text-[10px]">Gen...</span>
                            {shouldShowProgress && (
                              <span className="ml-1 text-[10px] font-mono">
                                {Math.round(progress * 100)}%
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <RefreshCwIcon size={10} className="mr-1" />
                            <span className="text-[10px]">Regen</span>
                          </>
                        )}
                      </Button>

                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isEnhancing}
                          className="rounded-l-none px-1 h-5 border-l-0 hover:bg-neutral-100 disabled:opacity-50 border-neutral-300"
                        >
                          <ChevronDownIcon size={10} />
                        </Button>
                      </PopoverTrigger>
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
                                  title={template.fullTitle}
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
              )}
            </button>
          )}

          {/* Transcript Tab - always show */}
          <button
            onClick={() => handleTabClick('transcript')}
            className={cn(
              "relative px-4 py-2 text-xs font-medium transition-all duration-200 border-b-2 -mb-px flex items-center gap-1.5",
              activeTab === 'transcript'
                ? "text-neutral-900 border-neutral-900"
                : "text-neutral-600 border-transparent hover:text-neutral-800"
            )}
          >
            <MicIcon size={14} />
            Transcript
          </button>
        </div>
      </div>
    </div>
  );
}
