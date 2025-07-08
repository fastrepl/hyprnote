import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMatch } from "@tanstack/react-router";
import { writeText as writeTextToClipboard } from "@tauri-apps/plugin-clipboard-manager";
import { AudioLinesIcon, CheckIcon, ClipboardIcon, CopyIcon, TextSearchIcon, UploadIcon } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import { ParticipantsChipInner } from "@/components/editor-area/note-header/chips/participants-chip";
import { useHypr } from "@/contexts";
import { commands as dbCommands, Human, Word } from "@hypr/plugin-db";
import { commands as miscCommands } from "@hypr/plugin-misc";
import TranscriptEditor, {
  getSpeakerLabel,
  SPEAKER_ID_ATTR,
  SPEAKER_INDEX_ATTR,
  SPEAKER_LABEL_ATTR,
  type SpeakerChangeRange,
  type SpeakerViewInnerProps,
  type TranscriptEditorRef,
} from "@hypr/tiptap/transcript";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { useOngoingSession } from "@hypr/utils/contexts";
import { ListeningIndicator } from "../components/listening-indicator";
import { SearchHeader } from "../components/search-header";
import { useTranscript } from "../hooks/useTranscript";
import { useTranscriptWidget } from "../hooks/useTranscriptWidget";

function useContainerWidth(ref: React.RefObject<HTMLElement>) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(element);
    // Set initial width
    setWidth(element.getBoundingClientRect().width);

    return () => {
      resizeObserver.disconnect();
    };
  }, [ref]);

  return width;
}

export function TranscriptView() {
  const queryClient = useQueryClient();

  // Search state
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Single container ref and panel width for the entire component
  const containerRef = useRef<HTMLDivElement>(null);
  const panelWidth = useContainerWidth(containerRef);

  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: true });
  const sessionId = noteMatch.params.id;

  const ongoingSession = useOngoingSession((s) => ({
    start: s.start,
    status: s.status,
    loading: s.loading,
    isInactive: s.status === "inactive",
  }));
  const { showEmptyMessage, hasTranscript } = useTranscriptWidget(sessionId);
  const { isLive, words } = useTranscript(sessionId);

  const editorRef = useRef<TranscriptEditorRef | null>(null);

  useEffect(() => {
    if (words && words.length > 0) {
      editorRef.current?.setWords(words);
      editorRef.current?.scrollToBottom();
    }
  }, [words, isLive]);

  // Add Ctrl+F keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        const currentShowActions = hasTranscript && sessionId && ongoingSession.isInactive;
        if (currentShowActions) {
          setIsSearchActive(true);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [hasTranscript, sessionId, ongoingSession.isInactive]);

  const audioExist = useQuery(
    {
      refetchInterval: 2500,
      enabled: !!sessionId,
      queryKey: ["audioExist", sessionId],
      queryFn: () => miscCommands.audioExist(sessionId!),
    },
    queryClient,
  );

  const handleCopyAll = useCallback(async () => {
    if (editorRef.current?.editor) {
      const text = editorRef.current.toText();
      await writeTextToClipboard(text);
    }
  }, [editorRef]);

  const handleOpenSession = useCallback(() => {
    if (sessionId) {
      miscCommands.audioOpen(sessionId);
    }
  }, [sessionId]);

  const handleUpdate = (words: Word[]) => {
    if (!isLive) {
      dbCommands.getSession({ id: sessionId! }).then((session) => {
        if (session) {
          dbCommands.upsertSession({ ...session, words });
        }
      });
    }
  };

  if (!sessionId) {
    return null;
  }

  const showActions = hasTranscript && sessionId && ongoingSession.isInactive;

  return (
    <div className="w-full h-full flex flex-col" ref={containerRef}>
      {/* Conditional Header Rendering */}
      {isSearchActive
        ? (
          <SearchHeader
            editorRef={editorRef}
            onClose={() => setIsSearchActive(false)}
          />
        )
        : (
          <header className="flex items-center justify-between w-full px-4 py-1 my-1 border-b border-neutral-100">
            {!showEmptyMessage && (
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-neutral-900">Transcript</h2>
                {isLive && (
                  <div className="relative h-1.5 w-1.5">
                    <div className="absolute inset-0 rounded-full bg-red-500/30"></div>
                    <div className="absolute inset-0 rounded-full bg-red-500 animate-ping"></div>
                  </div>
                )}
              </div>
            )}
            <div className="not-draggable flex items-center ">
              {showActions && (
                <Button
                  className="w-8 h-8"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSearchActive(true)}
                >
                  <TextSearchIcon size={14} className="text-neutral-600" />
                </Button>
              )}
              {(audioExist.data && showActions) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenSession}
                >
                  <AudioLinesIcon size={14} className="text-neutral-600" />
                </Button>
              )}
              {showActions && <CopyButton onCopy={handleCopyAll} />}
            </div>
          </header>
        )}

      <div className="flex-1 overflow-hidden flex flex-col">
        {showEmptyMessage
          ? <RenderEmpty sessionId={sessionId} panelWidth={panelWidth} />
          : (
            <>
              <TranscriptEditor
                ref={editorRef}
                initialWords={words}
                editable={ongoingSession.isInactive}
                onUpdate={handleUpdate}
                c={SpeakerSelector}
              />
              {isLive && <ListeningIndicator />}
            </>
          )}
      </div>
    </div>
  );
}

function RenderEmpty({ sessionId, panelWidth }: {
  sessionId: string;
  panelWidth: number;
}) {
  const ongoingSession = useOngoingSession((s) => ({
    start: s.start,
    status: s.status,
    loading: s.loading,
  }));

  const handleStartRecording = () => {
    if (ongoingSession.status === "inactive") {
      ongoingSession.start(sessionId);
    }
  };

  const isUltraCompact = panelWidth < 150;
  const isVeryNarrow = panelWidth < 200;
  const isNarrow = panelWidth < 400;
  const showFullText = panelWidth >= 400;

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-neutral-500 font-medium text-center">
        <div
          className={`mb-6 text-neutral-600 flex ${isNarrow ? "flex-col" : "flex-row"} items-center ${
            isNarrow ? "gap-2" : "gap-1.5"
          }`}
        >
          <Button
            size="sm"
            onClick={handleStartRecording}
            disabled={ongoingSession.loading}
            className={isUltraCompact ? "px-3" : ""}
            title={isUltraCompact ? (ongoingSession.loading ? "Starting..." : "Start recording") : undefined}
          >
            {ongoingSession.loading ? <Spinner color="black" /> : (
              <div className="relative h-2 w-2">
                <div className="absolute inset-0 rounded-full bg-red-500"></div>
                <div className="absolute inset-0 rounded-full bg-red-400 animate-ping"></div>
              </div>
            )}
            {!isUltraCompact && (
              <span className="ml-2">
                {ongoingSession.loading ? "Starting..." : "Start recording"}
              </span>
            )}
          </Button>
          {showFullText && <span className="text-sm">to see live transcript</span>}
        </div>

        <div className={`flex items-center justify-center mb-4 ${isUltraCompact ? "w-full" : "w-full max-w-[240px]"}`}>
          <div className="h-px bg-neutral-200 flex-grow"></div>
          <span className="px-3 text-xs text-neutral-400 font-medium">or</span>
          <div className="h-px bg-neutral-200 flex-grow"></div>
        </div>

        <div className="flex flex-col gap-2">
          {isUltraCompact
            ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="hover:bg-neutral-100"
                  disabled
                  title="Upload recording"
                >
                  <UploadIcon size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="hover:bg-neutral-100"
                  disabled
                  title="Paste transcript"
                >
                  <ClipboardIcon size={14} />
                </Button>
              </>
            )
            : (
              <>
                <Button variant="outline" size="sm" className="hover:bg-neutral-100" disabled>
                  <UploadIcon size={14} />
                  {isVeryNarrow ? "Upload" : "Upload recording"}
                  {!isNarrow && <span className="text-xs text-neutral-400 italic ml-1">coming soon</span>}
                </Button>
                <Button variant="outline" size="sm" className="hover:bg-neutral-100" disabled>
                  <ClipboardIcon size={14} />
                  {isVeryNarrow ? "Paste" : "Paste transcript"}
                  {!isNarrow && <span className="text-xs text-neutral-400 italic ml-1">coming soon</span>}
                </Button>
              </>
            )}
        </div>
      </div>
    </div>
  );
}

const SpeakerSelector = (props: SpeakerViewInnerProps) => {
  return <MemoizedSpeakerSelector {...props} />;
};

const MemoizedSpeakerSelector = memo(({
  onSpeakerChange,
  speakerId,
  speakerIndex,
  speakerLabel,
}: SpeakerViewInnerProps) => {
  const { userId } = useHypr();
  const [isOpen, setIsOpen] = useState(false);
  const [speakerRange, setSpeakerRange] = useState<SpeakerChangeRange>("current");
  const inactive = useOngoingSession(s => s.status === "inactive");
  const [human, setHuman] = useState<Human | null>(null);

  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const sessionId = noteMatch?.params.id;

  const { data: participants = [] } = useQuery({
    enabled: !!sessionId,
    queryKey: ["participants", sessionId!, "selector"],
    queryFn: () => dbCommands.sessionListParticipants(sessionId!),
  });

  useEffect(() => {
    if (human) {
      onSpeakerChange(human, speakerRange);
    }
  }, [human, speakerRange]);

  useEffect(() => {
    const foundHuman = participants.find((s) => s.id === speakerId);

    if (foundHuman) {
      setHuman(foundHuman);
    }
  }, [participants, speakerId]);

  const handleClickHuman = (human: Human) => {
    setHuman(human);
    setIsOpen(false);
  };

  if (!sessionId) {
    return <p></p>;
  }

  if (!inactive) {
    return <p></p>;
  }

  const getDisplayName = (human: Human | null) => {
    if (human) {
      if (human.id === userId && !human.full_name) {
        return "You";
      }

      if (human.full_name) {
        return human.full_name;
      }
    }

    return getSpeakerLabel({
      [SPEAKER_INDEX_ATTR]: speakerIndex,
      [SPEAKER_ID_ATTR]: speakerId,
      [SPEAKER_LABEL_ATTR]: speakerLabel ?? null,
    });
  };

  return (
    <div className="mt-2 sticky top-0 z-10 bg-neutral-50">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          onMouseDown={(e) => {
            e.preventDefault();
          }}
        >
          <span className="underline py-1 font-semibold">
            {getDisplayName(human)}
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" side="bottom">
          <div className="space-y-4">
            <div className="border-b border-neutral-100 pb-3">
              <SpeakerRangeSelector
                value={speakerRange}
                onChange={setSpeakerRange}
              />
            </div>

            <ParticipantsChipInner sessionId={sessionId} handleClickHuman={handleClickHuman} />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
});

interface SpeakerRangeSelectorProps {
  value: SpeakerChangeRange;
  onChange: (value: SpeakerChangeRange) => void;
}

function SpeakerRangeSelector({ value, onChange }: SpeakerRangeSelectorProps) {
  const options = [
    { value: "current" as const, label: "Just this" },
    { value: "all" as const, label: "Replace all" },
    { value: "fromHere" as const, label: "From here" },
  ];

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-neutral-700">Apply speaker change to:</p>
      <div className="flex rounded-md border border-neutral-200 p-0.5 bg-neutral-50">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex-1 cursor-pointer"
          >
            <input
              type="radio"
              name="speaker-range"
              value={option.value}
              className="sr-only"
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <div
              className={`px-2 py-1 text-xs font-medium text-center rounded transition-colors ${
                value === option.value
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-white/50"
              }`}
            >
              {option.label}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

function CopyButton({ onCopy }: { onCopy: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
    >
      {copied
        ? <CheckIcon size={14} className="text-neutral-800" />
        : <CopyIcon size={14} className="text-neutral-600" />}
    </Button>
  );
}
