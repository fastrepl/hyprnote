import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMatch } from "@tanstack/react-router";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { AudioLinesIcon, ClipboardIcon, Copy, TextSearchIcon, UploadIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ParticipantsChipInner } from "@/components/editor-area/note-header/chips/participants-chip";
import { commands as dbCommands, Human, Word } from "@hypr/plugin-db";
import { commands as miscCommands } from "@hypr/plugin-misc";
import TranscriptEditor, { type SpeakerViewInnerProps, type TranscriptEditorRef } from "@hypr/tiptap/transcript";
import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { useOngoingSession, useSessions } from "@hypr/utils/contexts";
import { useTranscript } from "../hooks/useTranscript";
import { useTranscriptWidget } from "../hooks/useTranscriptWidget";

export function TranscriptView() {
  const queryClient = useQueryClient();

  const sessionId = useSessions((s) => s.currentSessionId);
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

  const handleCopyAll = () => {
    if (words && words.length > 0) {
      const transcriptText = words.map((word) => word.text).join(" ");
      writeText(transcriptText);
    }
  };

  const audioExist = useQuery(
    {
      refetchInterval: 2500,
      enabled: !!sessionId,
      queryKey: ["audioExist", sessionId],
      queryFn: () => miscCommands.audioExist(sessionId!),
    },
    queryClient,
  );

  const handleOpenSession = () => {
    if (sessionId) {
      miscCommands.audioOpen(sessionId);
    }
  };

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

  return (
    <div className="w-full h-full flex flex-col">
      <div className="px-4 py-1 border-b border-neutral-100">
        <header className="flex items-center justify-between w-full">
          {!showEmptyMessage && (
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-neutral-900">Transcript</h2>
              {isLive && (
                <div className="flex items-center gap-1.5">
                  <div className="relative h-1.5 w-1.5">
                    <div className="absolute inset-0 rounded-full bg-red-500/30"></div>
                    <div className="absolute inset-0 rounded-full bg-red-500 animate-ping"></div>
                  </div>
                  <span className="text-xs font-medium text-red-600">Live</span>
                </div>
              )}
            </div>
          )}
          <div className="not-draggable flex items-center gap-1">
            {(hasTranscript && sessionId) && <SearchAndReplace editorRef={editorRef} />}
            {(audioExist.data && ongoingSession.isInactive && hasTranscript && sessionId) && (
              <TooltipProvider key="listen-recording-tooltip">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-neutral-100"
                      onClick={handleOpenSession}
                    >
                      <AudioLinesIcon size={14} className="text-neutral-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Listen to recording</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {(hasTranscript && sessionId) && (
              <TooltipProvider key="copy-all-tooltip">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-neutral-100"
                      onClick={handleCopyAll}
                    >
                      <Copy size={14} className="text-neutral-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Copy transcript</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </header>
      </div>

      <div className="flex-1 overflow-hidden">
        {showEmptyMessage
          ? <RenderEmpty sessionId={sessionId} />
          : (
            <div className="px-4 h-full">
              <TranscriptEditor
                ref={editorRef}
                initialWords={words}
                editable={ongoingSession.isInactive}
                onUpdate={handleUpdate}
                c={SpeakerSelector}
              />
            </div>
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

const SpeakerSelector = ({
  onSpeakerChange,
  speakerId,
  speakerIndex,
}: SpeakerViewInnerProps) => {
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
      onSpeakerChange(human);
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

  if (!inactive && !human) {
    return <p></p>;
  }

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
            {human ? (human.full_name ?? "You") : `Speaker ${speakerIndex ?? 0}`}
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
};

type SpeakerChangeRange = "current" | "all" | "fromHere";

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
          <label key={option.value} className="flex-1 cursor-pointer">
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

function SearchAndReplace({ editorRef }: { editorRef: React.RefObject<any> }) {
  const [expanded, setExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.editor.commands.setSearchTerm(searchTerm);

      if (searchTerm.substring(0, searchTerm.length - 1) === replaceTerm) {
        setReplaceTerm(searchTerm);
      }
    }
  }, [searchTerm]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.editor.commands.setReplaceTerm(replaceTerm);
    }
  }, [replaceTerm]);

  const handleReplaceAll = () => {
    if (editorRef.current && searchTerm) {
      editorRef.current.editor.commands.replaceAll(replaceTerm);
      setExpanded(false);
      setSearchTerm("");
      setReplaceTerm("");
    }
  };

  return (
    <Popover open={expanded} onOpenChange={setExpanded}>
      <PopoverTrigger asChild>
        <Button
          className="w-8"
          variant="ghost"
          size="icon"
        >
          <TextSearchIcon size={14} className="text-neutral-600" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-2" align="start" side="left">
        <div className="flex flex-row gap-2">
          <Input
            className="h-5 w-32"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search"
          />
          <Input
            className="h-5 w-32"
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            placeholder="Replace"
          />
          <Button
            className="h-5"
            variant="default"
            onClick={handleReplaceAll}
          >
            Replace
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
