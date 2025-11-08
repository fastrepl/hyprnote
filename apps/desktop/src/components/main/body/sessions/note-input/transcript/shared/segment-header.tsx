import { cn } from "@hypr/utils";

import chroma from "chroma-js";
import { useCallback, useMemo } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";
import * as main from "../../../../../../../store/tinybase/main";
import { ChannelProfile, type Segment } from "../../../../../../../utils/segment";
import { Operations } from "./operations";

export function SegmentHeader({
  segment,
  operations,
  sessionId,
}: {
  segment: Segment;
  operations?: Operations;
  sessionId?: string;
}) {
  const formatTimestamp = useCallback((ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }

    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  const timestamp = useMemo(() => {
    if (segment.words.length === 0) {
      return "00:00 - 00:00";
    }

    const firstWord = segment.words[0];
    const lastWord = segment.words[segment.words.length - 1];

    const [from, to] = [firstWord.start_ms, lastWord.end_ms].map(formatTimestamp);
    return `${from} - ${to}`;
  }, [segment.words.length, formatTimestamp]);

  const color = useSegmentColor(segment.key);
  const label = useSpeakerLabel(segment.key);
  const participants = useSessionParticipants(sessionId);

  const mode = operations && Object.keys(operations).length > 0 ? "editor" : "viewer";
  const wordIds = segment.words.filter((w) => w.id).map((w) => w.id!);

  const handleAssignSpeaker = useCallback(
    (humanId: string) => {
      if (wordIds.length > 0 && operations?.onAssignSpeaker) {
        operations.onAssignSpeaker(wordIds, humanId);
      }
    },
    [wordIds, operations],
  );

  if (mode === "editor" && wordIds.length > 0) {
    return (
      <p
        className={cn([
          "sticky top-0 z-20",
          "-mx-3 px-3 py-1",
          "bg-background",
          "border-b border-neutral-200",
          "text-xs font-light",
          "flex items-center justify-between",
        ])}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <span style={{ color }} className="cursor-pointer rounded hover:bg-neutral-100">
              {label}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Assign Speaker</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {participants.map((participant) => (
                  <DropdownMenuItem
                    key={participant.humanId}
                    onClick={() => handleAssignSpeaker(participant.humanId)}
                  >
                    {participant.name || participant.humanId}
                  </DropdownMenuItem>
                ))}
                {participants.length === 0 && <DropdownMenuItem disabled>No participants available</DropdownMenuItem>}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="font-mono text-neutral-500">{timestamp}</span>
      </p>
    );
  }

  return (
    <p
      className={cn([
        "sticky top-0 z-20",
        "-mx-3 px-3 py-1",
        "bg-background",
        "border-b border-neutral-200",
        "text-xs font-light",
        "flex items-center justify-between",
      ])}
    >
      <span style={{ color }}>{label}</span>
      <span className="font-mono text-neutral-500">{timestamp}</span>
    </p>
  );
}

function useSegmentColor(key: Segment["key"]) {
  return useMemo(() => {
    const speakerIndex = key.speaker_index ?? 0;

    const channelPalettes = [
      [10, 25, 0, 340, 15, 350],
      [285, 305, 270, 295, 315, 280],
    ];

    const hues = channelPalettes[key.channel % 2];
    const hue = hues[speakerIndex % hues.length];

    const light = 0.55;
    const chromaVal = 0.15;

    return chroma.oklch(light, chromaVal, hue).hex();
  }, [key]);
}

function useSpeakerLabel(key: Segment["key"]) {
  const store = main.UI.useStore(main.STORE_ID);

  return useMemo(() => {
    if (key.speaker_human_id && store) {
      const human = store.getRow("humans", key.speaker_human_id);
      if (human?.name) {
        return human.name as string;
      }
    }

    const channelLabel = key.channel === ChannelProfile.DirectMic
      ? "A"
      : key.channel === ChannelProfile.RemoteParty
      ? "B"
      : "C";

    return key.speaker_index !== undefined
      ? `Speaker ${key.speaker_index + 1}`
      : `Speaker ${channelLabel}`;
  }, [key, store]);
}

function useSessionParticipants(sessionId?: string) {
  const mappingIds = main.UI.useSliceRowIds(
    main.INDEXES.sessionParticipantsBySession,
    sessionId ?? "",
    main.STORE_ID,
  ) as string[];

  const queries = main.UI.useQueries(main.STORE_ID);

  return useMemo(() => {
    if (!queries || !sessionId) {
      return [];
    }

    const participants: Array<{ humanId: string; name: string }> = [];

    for (const mappingId of mappingIds) {
      const result = queries.getResultRow(
        main.QUERIES.sessionParticipantsWithDetails,
        mappingId,
      );

      if (!result) {
        continue;
      }

      const humanId = result.human_id as string;
      const name = (result.human_name as string) || "";

      participants.push({ humanId, name });
    }

    return participants;
  }, [mappingIds, queries, sessionId]);
}
