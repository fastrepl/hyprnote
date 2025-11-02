import { useMemo } from "react";

import { cn } from "@hypr/utils";
import type { Segment } from "../../../../../../../utils/segment";

type SegmentHeaderProps = {
  segmentKey: Segment["key"];
  timestamp: string;
};

export function SegmentHeader({ segmentKey, timestamp }: SegmentHeaderProps) {
  const colors = useSegmentColors(segmentKey);

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
      <span className="flex items-center gap-2">
        <span className={colors.channelColor}>{colors.channelLabel}</span>
        {colors.speakerLabel && (
          <>
            <span className="text-neutral-400">•</span>
            <span className={colors.speakerColor}>{colors.speakerLabel}</span>
          </>
        )}
      </span>
      <span className="font-mono text-neutral-500">{timestamp}</span>
    </p>
  );
}

function useSegmentColors(key: Segment["key"]) {
  return useMemo(() => getSegmentColors(key), [key]);
}

type ColorTheme = {
  base: string;
  speakers: readonly string[];
};

const CHANNEL_THEMES: readonly ColorTheme[] = [
  {
    base: "text-blue-600",
    speakers: ["text-blue-700", "text-blue-500", "text-sky-600", "text-indigo-600", "text-cyan-600"],
  },
  {
    base: "text-purple-600",
    speakers: ["text-purple-700", "text-purple-500", "text-violet-600", "text-fuchsia-600", "text-pink-600"],
  },
  {
    base: "text-emerald-600",
    speakers: ["text-emerald-700", "text-emerald-500", "text-teal-600", "text-green-600", "text-lime-600"],
  },
  {
    base: "text-amber-600",
    speakers: ["text-amber-700", "text-amber-500", "text-orange-600", "text-yellow-600", "text-rose-600"],
  },
] as const;

function getSegmentColors(key: Segment["key"]): {
  channelColor: string;
  speakerColor: string;
  channelLabel: string;
  speakerLabel: string | null;
} {
  const theme = CHANNEL_THEMES[key.channel % CHANNEL_THEMES.length];
  const channelLabel = `Channel ${key.channel}`;

  if (key._tag === "ChannelSpeaker") {
    const speakerColor = theme.speakers[key.speakerIndex % theme.speakers.length];
    const speakerLabel = `Speaker ${key.speakerIndex + 1}`;

    return {
      channelColor: theme.base,
      speakerColor,
      channelLabel,
      speakerLabel,
    };
  }

  return {
    channelColor: theme.base,
    speakerColor: "",
    channelLabel,
    speakerLabel: null,
  };
}
