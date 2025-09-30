import { ParticipantsChipInner } from "@/components/editor-area/note-header/chips/participants-chip";
import { useHypr } from "@/contexts";
import { commands as dbCommands, type Human, type Word2 } from "@hypr/plugin-db";
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
import { useOngoingSession } from "@hypr/utils/contexts";
import { useQuery } from "@tanstack/react-query";
import { useMatch } from "@tanstack/react-router";
import { ChevronDownIcon } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranscript } from "../right-panel/hooks/useTranscript";

interface TranscriptViewerProps {
  sessionId: string;
  onEditorRefChange?: (ref: TranscriptEditorRef | null) => void;
}

export function TranscriptViewer({ sessionId, onEditorRefChange }: TranscriptViewerProps) {
  const { words, partialWords, finalWords, isLive } = useTranscript(sessionId);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<TranscriptEditorRef | null>(null);

  // Notify parent when editor ref changes - check periodically for ref to be set
  useEffect(() => {
    // Initial notification
    if (onEditorRefChange) {
      onEditorRefChange(editorRef.current);
    }

    // Check if ref gets set later
    const checkInterval = setInterval(() => {
      if (editorRef.current?.editor && onEditorRefChange) {
        onEditorRefChange(editorRef.current);
        clearInterval(checkInterval);
      }
    }, 100);

    return () => clearInterval(checkInterval);
  }, [onEditorRefChange]);

  // Removed ongoingSession since we no longer show the start recording UI

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
    if (words && words.length > 0 && !isLive) {
      editorRef.current?.setWords(words);
      if (isAtBottom && editorRef.current?.isNearBottom()) {
        editorRef.current?.scrollToBottom();
      }
    }
  }, [words, isAtBottom, isLive]);

  // Auto-scroll for live transcript
  useEffect(() => {
    if (isLive && isAtBottom && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [finalWords, partialWords, isAtBottom, isLive]);

  const handleUpdate = (words: Word2[]) => {
    dbCommands.getSession({ id: sessionId }).then((session) => {
      if (session) {
        dbCommands.upsertSession({ ...session, words });
      }
    });
  };

  // Removed handleStartRecording since we no longer show the start recording UI

  // Show empty state when no words and not live - return blank instead of start recording UI
  const showEmptyMessage = sessionId && words.length <= 0 && !isLive;

  if (showEmptyMessage) {
    return <div className="h-full"></div>;
  }

  // Show simple text for live transcript
  if (isLive) {
    return (
      <div className="relative h-full flex flex-col">
        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pt-8 pb-6"
          onScroll={handleScroll}
        >
          <div className="px-8 text-[15px] leading-relaxed break-all space-y-2">
            {/* Final words - confirmed text */}
            <span className="text-gray-800">
              {finalWords.map(word => word.text).join(" ")}
            </span>
            {/* Partial words - still being processed */}
            {partialWords.length > 0 && (
              <span className="text-gray-400">
                {" "}
                {partialWords.map(word => word.text).join(" ")}
              </span>
            )}
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

  // Show editor for finished transcript
  return (
    <div className="w-full h-full flex flex-col">
      <TranscriptEditor
        ref={editorRef}
        initialWords={words}
        editable={true}
        onUpdate={handleUpdate}
        c={SpeakerSelector}
      />
    </div>
  );
}

// Speaker selector components (copied from transcript-view.tsx)
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
    <div className="mt-4 sticky top-0 z-10">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-auto p-1 font-semibold text-neutral-700 hover:text-neutral-900 bg-white"
            onMouseDown={(e) => {
              e.preventDefault();
            }}
          >
            {getDisplayName(human)}
          </Button>
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
