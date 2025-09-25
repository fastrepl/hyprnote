import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession, useOngoingSession } from "@hypr/utils/contexts";
import { cn } from "@hypr/ui/lib/utils";
import { PencilIcon, ZapIcon, MicIcon, ChevronDownIcon, RefreshCwIcon, PlusIcon } from "lucide-react";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { TemplateService } from "@/utils/template-service";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { useEnhancePendingState } from "@/hooks/enhance-pending";

interface TabHeaderProps {
  sessionId: string;
  onEnhance?: (params: { triggerType: "manual" | "template"; templateId?: string | null }) => void;
  isEnhancing?: boolean;
  progress?: number;
  showProgress?: boolean;
}

export interface TabHeaderRef {
  isVisible: boolean;
}

export const TabHeader = forwardRef<TabHeaderRef, TabHeaderProps>(({ sessionId, onEnhance, isEnhancing, progress = 0, showProgress = false }, ref) => {
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

  // Check if this is a meeting session (has transcript or is currently recording)
  const hasTranscript = session.words && session.words.length > 0;
  const isCurrentlyRecording = ongoingSessionStatus === "running_active" && ongoingSessionId === sessionId;
  const isSessionInactive = ongoingSessionStatus === "inactive" || session.id !== ongoingSessionId;
  const hasEnhancedMemo = !!session?.enhanced_memo_html;

  const canEnhanceTranscript = hasTranscript && isSessionInactive;

  // Keep the "meeting session" concept for overall tab visibility
  const isMeetingSession = hasTranscript || isCurrentlyRecording || isEnhancing;

  // BUT use floating button logic for Enhanced tab visibility
  const isEnhancePending = useEnhancePendingState(sessionId);
  const shouldShowEnhancedTab = hasEnhancedMemo || isEnhancePending || canEnhanceTranscript;

  // Automatic tab switching logic following existing conventions

  useEffect(() => {
    // When enhancement starts (immediately after recording ends) -> switch to enhanced note
    if (isEnhancePending || (ongoingSessionStatus === "inactive" && hasTranscript && shouldShowEnhancedTab)) {
      setActiveTab('enhanced');
    }
  }, [isEnhancePending, ongoingSessionStatus, hasTranscript, shouldShowEnhancedTab, setActiveTab]);

  // Set default tab to 'raw' for blank notes (no meeting session)
  useEffect(() => {
    if (!isMeetingSession) {
      setActiveTab('raw');
    }
  }, [isMeetingSession, setActiveTab]);

  const handleTabClick = (tab: 'raw' | 'enhanced' | 'transcript') => {
    setActiveTab(tab);
  };

  // Expose visibility state via ref
  useImperativeHandle(ref, () => ({
    isVisible: isMeetingSession ?? false,
  }), [isMeetingSession]);

  // Don't render tabs at all for blank notes (no meeting session)
  if (!isMeetingSession) {
    return null;
  }

  return (
    <div className="relative">
      {/* Tab container */}
      <div className="bg-white">
        <div className="flex px-8">
          <div className="flex border-b border-neutral-100 w-full">
          {/* Raw Note Tab */}
          <button
            onClick={() => handleTabClick('raw')}
            className={cn(
              "relative px-4 py-2 pl-1 text-xs font-medium transition-all duration-200 border-b-2 -mb-px flex items-center gap-1.5",
              activeTab === 'raw'
                ? "text-neutral-900 border-neutral-900"
                : "text-neutral-600 border-transparent hover:text-neutral-800"
            )}
          >
            Memos
          </button>

          {/* Enhanced Note Tab - show when session ended OR transcript exists OR enhanced memo exists */}
          {shouldShowEnhancedTab && (
            <button
              onClick={() => handleTabClick('enhanced')}
              className={cn(
                "relative px-4 py-2 text-xs pl-3 font-medium transition-all duration-200 border-b-2 -mb-px flex items-center gap-1.5",
                activeTab === 'enhanced'
                  ? "text-neutral-900 border-neutral-900"
                  : "text-neutral-600 border-transparent hover:text-neutral-800"
              )}
            >
              Summary
              
             
            </button>
          )}

          {/* Transcript Tab - always show */}
          <button
            onClick={() => handleTabClick('transcript')}
            className={cn(
              "relative px-4 py-2 text-xs pl-3 font-medium transition-all duration-200 border-b-2 -mb-px flex items-center gap-1.5",
              activeTab === 'transcript'
                ? "text-neutral-900 border-neutral-900"
                : "text-neutral-600 border-transparent hover:text-neutral-800"
            )}
          >
            Transcript
            {isCurrentlyRecording && (
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
});
