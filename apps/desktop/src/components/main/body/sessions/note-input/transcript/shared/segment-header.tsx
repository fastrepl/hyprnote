import chroma from "chroma-js";
import { useCallback, useMemo } from "react";

import { cn } from "@hypr/utils";
import type { Segment } from "../../../../../../../utils/segment";

export function SegmentHeader({ segment }: { segment: Segment }) {
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

  const colors = useSegmentColors(segment.key);

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
      <span style={{ color: colors.color }}>{colors.label}</span>
      <span className="font-mono text-neutral-500">{timestamp}</span>
    </p>
  );
}

function useSegmentColors(key: Segment["key"]) {
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

    return {
      color: chroma.oklch(light, chromaVal, hue).hex(),
      label: key.speaker_index !== undefined ? `Speaker ${key.speaker_index + 1}` : `Speaker ${key.channel}`,
    };
  }, [key]);
}
