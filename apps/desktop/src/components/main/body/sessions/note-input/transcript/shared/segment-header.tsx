import chroma from "chroma-js";
import { useCallback, useMemo } from "react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@hypr/ui/components/ui/context-menu";
import { cn } from "@hypr/utils";
import * as main from "../../../../../../../store/tinybase/main";
import { ChannelProfile, type Segment } from "../../../../../../../utils/segment";
import { Operations } from "./operations";

export function SegmentHeader({ segment, operations }: { segment: Segment; operations?: Operations }) {
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
  const humans = main.UI.useRowIds("humans", main.STORE_ID) ?? [];
  const store = main.UI.useStore(main.STORE_ID);

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

  const headerContent = (
    <p
      className={cn([
        "sticky top-0 z-20",
        "-mx-3 px-3 py-1",
        "bg-background",
        "border-b border-neutral-200",
        "text-xs font-light",
        "flex items-center justify-between",
        mode === "editor" && "cursor-pointer hover:bg-neutral-50",
      ])}
    >
      <span style={{ color }}>{label}</span>
      <span className="font-mono text-neutral-500">{timestamp}</span>
    </p>
  );

  if (mode === "editor" && wordIds.length > 0) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {headerContent}
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuSub>
            <ContextMenuSubTrigger>Assign Speaker</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {humans.map((humanId) => {
                const human = store?.getRow("humans", humanId);
                const name = human?.name || humanId;
                return (
                  <ContextMenuItem key={humanId} onClick={() => handleAssignSpeaker(humanId)}>
                    {name}
                  </ContextMenuItem>
                );
              })}
              {humans.length === 0 && <ContextMenuItem disabled>No speakers available</ContextMenuItem>}
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return headerContent;
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
