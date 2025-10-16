import { useEffect, useMemo } from "react";

import { type Word2 } from "@hypr/plugin-listener";
import NoteEditor from "@hypr/tiptap/editor";
import TranscriptEditor, { type SpeakerViewInnerProps } from "@hypr/tiptap/transcript";
import { cn } from "@hypr/ui/lib/utils";
import { type Tab, useTabs } from "../../../../store/zustand/tabs";

type EditorView = "raw" | "enhanced" | "transcript";

export function NoteInput({
  tab,
  sessionId,
  rawValue,
  enhancedValue,
  transcriptValue,
  onRawChange,
  onEnhancedChange,
  onTranscriptChange,
  isCurrentlyRecording,
  shouldShowTab,
  shouldShowEnhancedTab,
}: {
  tab: Tab;
  sessionId: string;
  rawValue: string;
  enhancedValue: string;
  transcriptValue: string;
  onRawChange: (value: string) => void;
  onEnhancedChange: (value: string) => void;
  onTranscriptChange: (value: string) => void;
  isCurrentlyRecording: boolean;
  shouldShowTab: boolean;
  shouldShowEnhancedTab: boolean;
}) {
  const { updateSessionTabState } = useTabs();

  const currentTab = tab.type === "sessions" ? (tab.state.editor ?? "raw") : "raw";

  const handleTabChange = (view: EditorView) => {
    updateSessionTabState(tab, { editor: view });
  };

  const editorKey = useMemo(
    () => `session-${sessionId}-${currentTab}`,
    [sessionId, currentTab],
  );

  useEffect(() => {
    if (!shouldShowTab && tab.type === "sessions") {
      updateSessionTabState(tab, { editor: "raw" });
    }
  }, [shouldShowTab, tab, updateSessionTabState]);

  const parseTranscript = (value: string): Word2[] | null => {
    if (!value) {
      return null;
    }
    try {
      const parsed = JSON.parse(value);
      return parsed.words ?? null;
    } catch {
      return null;
    }
  };

  const renderEditor = () => {
    switch (currentTab) {
      case "enhanced":
        return (
          <NoteEditor
            key={editorKey}
            initialContent={enhancedValue}
            handleChange={onEnhancedChange}
            mentionConfig={{
              trigger: "@",
              handleSearch: async () => {
                return [];
              },
            }}
          />
        );
      case "transcript":
        return (
          <TranscriptEditor
            key={editorKey}
            initialWords={parseTranscript(transcriptValue)}
            editable={true}
            onUpdate={(words) => {
              onTranscriptChange(JSON.stringify({ words }));
            }}
            c={SpeakerSelector}
          />
        );
      case "raw":
      default:
        return (
          <NoteEditor
            key={editorKey}
            initialContent={rawValue}
            handleChange={onRawChange}
            mentionConfig={{
              trigger: "@",
              handleSearch: async () => {
                return [];
              },
            }}
          />
        );
    }
  };

  return (
    <div className="flex flex-col h-full">
      {shouldShowTab && (
        <div className="relative">
          <div className="bg-white">
            <div className="flex">
              <div className="flex border-b border-neutral-100 w-full">
                {shouldShowEnhancedTab && (
                  <button
                    onClick={() => handleTabChange("enhanced")}
                    className={cn([
                      "relative px-2 py-2 text-xs pl-1 font-medium transition-all duration-200 border-b-2 -mb-px flex items-center gap-1.5",
                      currentTab === "enhanced"
                        ? ["text-neutral-900", "border-neutral-900"]
                        : ["text-neutral-600", "border-transparent", "hover:text-neutral-800"],
                    ])}
                  >
                    Summary
                  </button>
                )}

                <button
                  onClick={() => handleTabChange("raw")}
                  className={cn([
                    "relative py-2 text-xs font-medium transition-all duration-200 border-b-2 -mb-px flex items-center gap-1.5",
                    shouldShowEnhancedTab ? ["pl-3", "px-4"] : ["pl-1", "px-2"],
                    currentTab === "raw"
                      ? ["text-neutral-900", "border-neutral-900"]
                      : ["text-neutral-600", "border-transparent", "hover:text-neutral-800"],
                  ])}
                >
                  Memos
                </button>

                <button
                  onClick={() => handleTabChange("transcript")}
                  className={cn([
                    "relative px-4 py-2 text-xs pl-3 font-medium transition-all duration-200 border-b-2 -mb-px flex items-center gap-1.5",
                    currentTab === "transcript"
                      ? ["text-neutral-900", "border-neutral-900"]
                      : ["text-neutral-600", "border-transparent", "hover:text-neutral-800"],
                  ])}
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
      )}

      <div className="py-1"></div>
      <div className="flex-1 overflow-auto">
        {renderEditor()}
      </div>
    </div>
  );
}

function SpeakerSelector({ speakerLabel, speakerIndex }: SpeakerViewInnerProps) {
  const displayLabel = speakerLabel || `Speaker ${speakerIndex ?? 0}`;
  return <span className="font-medium text-neutral-700">{displayLabel}</span>;
}
