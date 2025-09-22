import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMatch } from "@tanstack/react-router";
import { writeText as writeTextToClipboard } from "@tauri-apps/plugin-clipboard-manager";
import clsx from "clsx";

import {
  AudioLinesIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardIcon,
  CopyIcon,
  TextSearchIcon,
  UploadIcon,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ParticipantList } from "@/components/editor-area/note-header/chips/participants-chip";
import { useHypr } from "@/contexts";
import { useContainerWidth } from "@/hooks/use-container-width";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as dbCommands, Human, Word2 } from "@hypr/plugin-db";
import { commands as miscCommands } from "@hypr/plugin-misc";
import TranscriptEditor, {
  getSpeakerLabel,
  SPEAKER_ID_ATTR,
  SPEAKER_INDEX_ATTR,
  SPEAKER_LABEL_ATTR,
  type SpeakerChangeRange,
  type SpeakerViewInnerProps,
  type TranscriptEditorRef,
  wordsToSpeakerChunks,
} from "@hypr/tiptap/transcript";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { cn } from "@hypr/ui/lib/utils";
import { useOngoingSession } from "@hypr/utils/contexts";
import { SearchHeader } from "../components/search-header";
import { useTranscript } from "../hooks/useTranscript";

export function TranscriptView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelWidth = useContainerWidth(containerRef);

  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: true });
  const sessionId = noteMatch.params.id;

  const { words, isLive } = useTranscript(sessionId);
  const showEmptyMessage = sessionId && words.length <= 0 && !isLive;

  if (!sessionId) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col" ref={containerRef}>
      {showEmptyMessage
        ? <RenderNotInMeetingEmpty sessionId={sessionId} panelWidth={panelWidth} />
        : isLive
        ? <RenderInMeeting words={words} />
        : <RenderNotInMeeting sessionId={sessionId} words={words} />}
    </div>
  );
}

function RenderInMeeting({ words }: { words: Word2[] }) {
  const { isAtBottom, scrollContainerRef, handleScroll, scrollToBottom } = useScrollToBottom([words]);

  return (
    <div className="flex-1 relative">
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-2 pt-2 pb-6 space-y-4 absolute inset-0"
        onScroll={handleScroll}
      >
        <div className="text-[15px] text-gray-800 leading-relaxed pl-1">
          {words.map(word => word.text).join(" ")}
        </div>
      </div>

      {!isAtBottom && (
        <Button
          onClick={scrollToBottom}
          size="sm"
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 rounded-full shadow-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 z-10 flex items-center gap-1"
          variant="outline"
        >
          <ChevronDownIcon size={14} />
          <span className="text-xs">Go to bottom</span>
        </Button>
      )}
    </div>
  );
}

function RenderNotInMeeting({ sessionId, words }: { sessionId: string; words: Word2[] }) {
  const { userId } = useHypr();
  const queryClient = useQueryClient();

  const [editable, setEditable] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const speakerChunks = useMemo(() => wordsToSpeakerChunks(words), [words]);
  const [editorWords, setEditorWords] = useState<Word2[]>(words);

  const editorRef = useRef<TranscriptEditorRef | null>(null);
  const { isAtBottom, scrollContainerRef, handleScroll, scrollToBottom } = useScrollToBottom([speakerChunks]);

  const ongoingSession = useOngoingSession((s) => ({
    isInactive: s.status === "inactive",
  }));

  useEffect(() => {
    if (words && words.length > 0) {
      editorRef.current?.setWords(words);
      if (editorRef.current?.isNearBottom()) {
        editorRef.current?.scrollToBottom();
      }
    }
  }, [words]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        if (ongoingSession.isInactive) {
          setIsSearchActive(true);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [ongoingSession.isInactive]);

  const audioExist = useQuery(
    {
      refetchInterval: 2500,
      enabled: !!sessionId,
      queryKey: ["audio", sessionId, "exist"],
      queryFn: () => miscCommands.audioExist(sessionId),
    },
    queryClient,
  );

  const handleCopyAll = () => {
    if (editorRef.current?.editor) {
      const text = editorRef.current.toText();
      writeTextToClipboard(text);
    } else {
      const text = speakerChunks.map((chunk) => {
        const speakerName = getSpeakerDisplayName(chunk);
        const content = chunk.words.map(word => word.text).join(" ");
        return `${speakerName}: ${content}`;
      }).join("\n\n");
      writeTextToClipboard(text);
    }
  };

  const handleOpenSession = useCallback(() => {
    miscCommands.audioOpen(sessionId);
  }, [sessionId]);

  const handeToggleEdit = useCallback(() => {
    setEditable((v) => {
      if (v) {
        dbCommands.getSession({ id: sessionId }).then((session) => {
          if (session) {
            dbCommands.upsertSession({ ...session, words: editorWords }).then(() => {
              queryClient.invalidateQueries({
                queryKey: ["session", "words", sessionId],
              });
            });
          }
        });
      } else {
        if (userId) {
          analyticsCommands.event({
            event: "transcript_toggle_edit",
            distinct_id: userId,
          });
        }
      }

      return !v;
    });
  }, [editorWords, userId]);

  const handleUpdate = (words: Word2[]) => {
    setEditorWords(words);
  };

  if (isSearchActive) {
    return (
      <>
        <SearchHeader
          editorRef={editorRef}
          onClose={() => setIsSearchActive(false)}
        />
        <div className="flex-1 overflow-hidden flex flex-col">
          <TranscriptEditor
            ref={editorRef}
            initialWords={words}
            editable={ongoingSession.isInactive && editable}
            onUpdate={handleUpdate}
            c={SpeakerSelector}
          />
        </div>
      </>
    );
  }

  function getSpeakerDisplayName(chunk: any) {
    if (!chunk.speaker?.type) {
      return "Unknown";
    }

    if (chunk.speaker.type === "assigned") {
      return chunk.speaker.value.label;
    }

    return `Speaker ${chunk.speaker.value.index}`;
  }

  const EditToggle = () => {
    return (
      <Button
        className="px-2 py-0.5 h-6 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200"
        variant="ghost"
        size="sm"
        onClick={handeToggleEdit}
      >
        <span className="text-2xs text-neutral-600 font-normal">
          {editable ? "Save" : "Edit"}
        </span>
      </Button>
    );
  };

  return (
    <>
      <header className="flex items-center justify-between w-full px-4 py-1 my-1 border-b">
        <div className="flex items-center">
          <h2 className="text-sm font-semibold text-neutral-900">Transcript</h2>
          <div className="ml-2">
            <EditToggle />
          </div>
        </div>
        <div className="not-draggable flex items-center">
          <Button
            className="w-8 h-8"
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchActive(true)}
          >
            <TextSearchIcon size={14} className="text-neutral-600" />
          </Button>
          {audioExist.data && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenSession}
            >
              <AudioLinesIcon size={14} className="text-neutral-600" />
            </Button>
          )}
          <CopyButton onCopy={handleCopyAll} />
        </div>
      </header>

      {editable
        ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <TranscriptEditor
              ref={editorRef}
              initialWords={words}
              editable={ongoingSession.isInactive && editable}
              onUpdate={handleUpdate}
              c={SpeakerSelector}
            />
          </div>
        )
        : (
          <div className="flex-1 relative">
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto px-2 pt-4 pb-6 space-y-4 absolute inset-0"
              onScroll={handleScroll}
            >
              {speakerChunks.map((chunk, index) => (
                <div key={index} className="space-y-1">
                  <span className="text-xs font-medium text-gray-700 p-1 rounded-md bg-white border border-gray-200">
                    {getSpeakerDisplayName(chunk)}
                  </span>
                  <div className="text-[15px] text-gray-800 leading-relaxed pl-1">
                    {chunk.words.map(word => word.text).join(" ")}
                  </div>
                </div>
              ))}
            </div>

            {!isAtBottom && (
              <Button
                onClick={scrollToBottom}
                size="sm"
                className={cn([
                  "absolute bottom-6 left-1/2 transform -translate-x-1/2 rounded-full shadow-xl",
                  "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 z-10 flex items-center gap-1",
                ])}
                variant="outline"
              >
                <ChevronDownIcon size={14} />
                <span className="text-xs">Go to bottom</span>
              </Button>
            )}
          </div>
        )}
    </>
  );
}

function RenderNotInMeetingEmpty({ sessionId, panelWidth }: { sessionId: string; panelWidth: number }) {
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
    <div className="flex-1 flex items-center justify-center">
      <div className="text-neutral-500 font-medium text-center">
        <div
          className={`mb-6 text-neutral-600 flex ${isNarrow ? "flex-col" : "flex-row"} items-center ${
            isNarrow ? "gap-2" : "gap-1.5"
          }`}
        >
          <Button
            size="sm"
            onClick={handleStartRecording}
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

        <div
          className={clsx([
            "flex items-center justify-center mb-4",
            isUltraCompact ? "w-full" : "w-full max-w-[240px]",
          ])}
        >
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
  const [candidate, setCandidate] = useState<Human | null>(null);

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

  useEffect(() => {
    setCandidate(null);
  }, [isOpen]);

  const handleClickHuman = (human: Human) => {
    setCandidate(human);
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
    <div className="mt-4 sticky top-0 z-10 bg-neutral-50">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-auto p-1 font-semibold text-neutral-700 hover:text-neutral-900 -ml-1"
            onMouseDown={(e) => {
              e.preventDefault();
            }}
          >
            {getDisplayName(human)}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" side="bottom">
          <div className="space-y-4">
            <ParticipantList
              selectedHuman={candidate}
              allowMutate={false}
              sessionId={sessionId}
              handleClickHuman={handleClickHuman}
            />
            {candidate && (
              <div className="flex flex-col gap-2">
                <hr className="mb-2" />
                <SpeakerRangeSelector
                  value={speakerRange}
                  onChange={setSpeakerRange}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    onSpeakerChange(candidate, speakerRange);
                    setIsOpen(false);

                    if (userId) {
                      analyticsCommands.event({
                        event: "transcript_speaker_change",
                        distinct_id: userId,
                      });
                    }
                  }}
                >
                  Apply Speaker Change
                </Button>
              </div>
            )}
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
    { value: "current" as const, label: "Only this" },
    { value: "fromHere" as const, label: "From here" },
    { value: "all" as const, label: "All" },
  ];

  return (
    <div className="space-y-1.5">
      <div className="flex rounded-md border border-neutral-200 bg-white">
        {options.map((option, index) => (
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
              className={clsx(
                "px-2 py-1.5 text-xs font-medium text-center transition-colors border-neutral-200",
                index === 0 && "border-r rounded-l-md",
                index === options.length - 1 && "border-l rounded-r-md",
                value === option.value
                  ? "bg-gray-100 text-neutral-900"
                  : "hover:bg-gray-50 text-neutral-500",
              )}
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

function useScrollToBottom(dependencies: any[] = []) {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 100;
    const atBottom = scrollHeight - scrollTop - clientHeight <= threshold;
    setIsAtBottom(atBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [...dependencies, isAtBottom, scrollToBottom]);

  return {
    isAtBottom,
    scrollContainerRef,
    handleScroll,
    scrollToBottom,
  };
}
