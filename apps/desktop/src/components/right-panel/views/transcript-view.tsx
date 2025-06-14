import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMatch } from "@tanstack/react-router";
import { writeText as writeTextToClipboard } from "@tauri-apps/plugin-clipboard-manager";
import useDebouncedCallback from "beautiful-react-hooks/useDebouncedCallback";
import {
  AudioLinesIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardIcon,
  CopyIcon,
  ReplaceIcon,
  TextSearchIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import { ParticipantsChipInner } from "@/components/editor-area/note-header/chips/participants-chip";
import { useHypr } from "@/contexts";
import { commands as dbCommands, Human, Word } from "@hypr/plugin-db";
import { commands as miscCommands } from "@hypr/plugin-misc";
import TranscriptEditor, {
  type SpeakerChangeRange,
  type SpeakerViewInnerProps,
  type TranscriptEditorRef,
} from "@hypr/tiptap/transcript";
import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { useOngoingSession } from "@hypr/utils/contexts";
import { ListeningIndicator } from "../components/listening-indicator";
import { useTranscript } from "../hooks/useTranscript";
import { useTranscriptWidget } from "../hooks/useTranscriptWidget";

export function TranscriptView() {
  const queryClient = useQueryClient();

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
    <div className="w-full h-full flex flex-col">
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
          {showActions && <SearchAndReplace editorRef={editorRef} />}
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

      <div className="flex-1 overflow-hidden flex flex-col">
        {showEmptyMessage
          ? <RenderEmpty sessionId={sessionId} />
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

function RenderEmpty({ sessionId }: { sessionId: string }) {
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

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-neutral-500 font-medium text-center">
        <div className="mb-6 text-neutral-600 flex items-center gap-1.5">
          <Button size="sm" onClick={handleStartRecording} disabled={ongoingSession.loading}>
            {ongoingSession.loading ? <Spinner color="black" /> : (
              <div className="relative h-2 w-2">
                <div className="absolute inset-0 rounded-full bg-red-500"></div>
                <div className="absolute inset-0 rounded-full bg-red-400 animate-ping"></div>
              </div>
            )}
            {ongoingSession.loading ? "Starting..." : "Start recording"}
          </Button>
          <span className="text-sm">to see live transcript</span>
        </div>

        <div className="flex items-center justify-center w-full max-w-[240px] mb-4">
          <div className="h-px bg-neutral-200 flex-grow"></div>
          <span className="px-3 text-xs text-neutral-400 font-medium">or</span>
          <div className="h-px bg-neutral-200 flex-grow"></div>
        </div>

        <div className="flex flex-col gap-2">
          <Button variant="outline" size="sm" className="hover:bg-neutral-100" disabled>
            <UploadIcon size={14} />Upload recording{" "}
            <span className="text-xs text-neutral-400 italic">coming soon</span>
          </Button>
          <Button variant="outline" size="sm" className="hover:bg-neutral-100" disabled>
            <ClipboardIcon size={14} />Paste transcript{" "}
            <span className="text-xs text-neutral-400 italic">coming soon</span>
          </Button>
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
  }, [human]);

  useEffect(() => {
    if (participants.length === 1 && participants[0]) {
      setHuman(participants[0]);
      return;
    }

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
    if (!human) {
      return `Speaker ${speakerIndex ?? 0}`;
    }
    if (human.id === userId && !human.full_name) {
      return "You";
    }
    return human.full_name ?? `Speaker ${speakerIndex ?? 0}`;
  };

  return (
    <div className="mt-2 sticky top-0 z-10 bg-neutral-50">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          onMouseDown={(e) => {
            // prevent cursor from moving to the end of the editor
            e.preventDefault();
          }}
        >
          <span className="underline py-1 font-semibold">
            {getDisplayName(human)}
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" side="bottom">
          <div className="space-y-4">
            {!speakerId && (
              <div className="border-b border-neutral-100 pb-3">
                <SpeakerRangeSelector
                  value={speakerRange}
                  onChange={setSpeakerRange}
                />
              </div>
            )}

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
            className={`flex-1 ${option.value === "current" ? "cursor-pointer" : "cursor-not-allowed"}`}
          >
            <input
              type="radio"
              name="speaker-range"
              value={option.value}
              className="sr-only"
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              disabled={option.value !== "current"}
            />
            <div
              className={`px-2 py-1 text-xs font-medium text-center rounded transition-colors ${
                value === option.value
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-white/50"
              } ${option.value !== "current" ? "opacity-50" : ""}`}
            >
              {option.label}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

export function SearchAndReplace({ editorRef }: { editorRef: React.RefObject<any> }) {
  const [isActive, setIsActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [resultCount, setResultCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Add ref for the search container
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounced search term update
  const debouncedSetSearchTerm = useDebouncedCallback(
    (value: string) => {
      if (editorRef.current) {
        editorRef.current.editor.commands.setSearchTerm(value);
        editorRef.current.editor.commands.resetIndex();
        setTimeout(() => {
          const storage = editorRef.current.editor.storage.searchAndReplace;
          const results = storage.results || [];
          setResultCount(results.length);
          setCurrentIndex((storage.resultIndex ?? 0) + 1);
        }, 100);
      }
    },
    [editorRef],
    300,
  );

  useEffect(() => {
    debouncedSetSearchTerm(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.editor.commands.setReplaceTerm(replaceTerm);
    }
  }, [replaceTerm]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        if (isActive) {
          setIsActive(false);
          setSearchTerm("");
          setReplaceTerm("");
          setResultCount(0);
          setCurrentIndex(0);
          if (editorRef.current) {
            editorRef.current.editor.commands.setSearchTerm("");
          }
        }
      }
    };

    if (isActive) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isActive, editorRef]);

  // Keyboard shortcut handler - only when transcript editor is focused
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        const isTranscriptFocused = editorRef.current?.editor?.isFocused;
        if (isTranscriptFocused) {
          e.preventDefault();
          setIsActive(true);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editorRef]);

  // Use extension's navigation commands
  const handleNext = () => {
    if (editorRef.current?.editor) {
      editorRef.current.editor.commands.nextSearchResult();
      setTimeout(() => {
        const storage = editorRef.current.editor.storage.searchAndReplace;
        setCurrentIndex((storage.resultIndex ?? 0) + 1);
        scrollCurrentResultIntoView(editorRef);
      }, 100);
    }
  };

  const handlePrevious = () => {
    if (editorRef.current?.editor) {
      editorRef.current.editor.commands.previousSearchResult();
      setTimeout(() => {
        const storage = editorRef.current.editor.storage.searchAndReplace;
        setCurrentIndex((storage.resultIndex ?? 0) + 1);
        scrollCurrentResultIntoView(editorRef);
      }, 100);
    }
  };

  function scrollCurrentResultIntoView(editorRef: React.RefObject<any>) {
    if (!editorRef.current) {
      return;
    }
    const editorElement = editorRef.current.editor.view.dom;
    const current = editorElement.querySelector(".search-result-current") as HTMLElement | null;
    if (current) {
      current.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }
  }

  const handleReplaceAll = () => {
    if (editorRef.current && searchTerm) {
      editorRef.current.editor.commands.replaceAll();
      setTimeout(() => {
        const storage = editorRef.current.editor.storage.searchAndReplace;
        const results = storage.results || [];
        setResultCount(results.length);
        setCurrentIndex(results.length > 0 ? 1 : 0);
      }, 100);
    }
  };

  const handleToggle = () => {
    setIsActive(!isActive);
    if (isActive && editorRef.current) {
      setSearchTerm("");
      setReplaceTerm("");
      setResultCount(0);
      setCurrentIndex(0);
      editorRef.current.editor.commands.setSearchTerm("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleToggle();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrevious();
      } else {
        handleNext();
      }
    } else if (e.key === "F3") {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrevious();
      } else {
        handleNext();
      }
    }
  };

  return (
    <div className="flex items-center hidden min-[1370px]:flex" ref={searchContainerRef}>
      {!isActive
        ? (
          <Button
            className="w-8 h-8"
            variant="ghost"
            size="icon"
            onClick={handleToggle}
          >
            <TextSearchIcon size={14} className="text-neutral-600" />
          </Button>
        )
        : (
          <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-md p-1.5 h-8">
            <div className="flex items-center gap-1">
              <Input
                className="h-6 w-24 text-xs border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-2 bg-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search..."
                autoFocus
              />
              <div className="h-4 w-px bg-neutral-300" />
              <Input
                className="h-6 w-24 text-xs border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-2 bg-transparent"
                value={replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Replace..."
              />
            </div>
            {searchTerm && (
              <div className="flex items-center gap-1 text-xs text-neutral-500">
                <span className="whitespace-nowrap">
                  {resultCount > 0 ? `${currentIndex}/${resultCount}` : "0/0"}
                </span>
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handlePrevious}
                    disabled={resultCount === 0}
                    title="Previous result (Shift+Enter, Shift+F3)"
                  >
                    <ChevronUpIcon size={12} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleNext}
                    disabled={resultCount === 0}
                    title="Next result (Enter, F3)"
                  >
                    <ChevronDownIcon size={12} />
                  </Button>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={handleReplaceAll}
              disabled={!searchTerm}
              title="Replace All"
              style={{ pointerEvents: "auto" }}
            >
              <ReplaceIcon size={12} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleToggle}
            >
              <XIcon size={12} />
            </Button>
          </div>
        )}
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
