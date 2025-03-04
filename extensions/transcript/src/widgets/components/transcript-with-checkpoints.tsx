import { TimelineView } from "@hypr/plugin-listener";
import { formatTime } from "../../utils";
import { FlagIcon } from "lucide-react";

interface TranscriptItem {
  type: "transcript";
  item: TimelineView["items"][0];
}

interface CheckpointItem {
  type: "checkpoint";
  timestamp: string;
}

type CombinedItem = TranscriptItem | CheckpointItem;

export default function TranscriptWithCheckpoints({
  transcript,
  checkpoints = [],
}: {
  transcript: TimelineView | null;
  checkpoints?: string[];
}) {
  if (!transcript) {
    return null;
  }

  const sortedItems = [...transcript.items].sort((a, b) => a.start - b.start);

  const sortedCheckpoints = [...checkpoints].sort();

  const checkpointMap = new Map<number, string[]>();

  const betweenBlockCheckpoints = new Set<string>();

  sortedCheckpoints.forEach((cp) => {
    const blockIndex = sortedItems.findIndex((block) => {
      const blockStart = formatTime(block.start);
      const blockEnd = formatTime(block.end);
      return cp >= blockStart && cp <= blockEnd;
    });

    if (blockIndex !== -1) {
      const existing = checkpointMap.get(blockIndex) || [];
      checkpointMap.set(blockIndex, [...existing, cp]);
    } else {
      betweenBlockCheckpoints.add(cp);
    }
  });

  const items: CombinedItem[] = [];
  let lastBlockEnd = "00:00";

  sortedItems.forEach((item) => {
    const blockStart = formatTime(item.start);

    sortedCheckpoints
      .filter(
        (cp) =>
          betweenBlockCheckpoints.has(cp) &&
          cp > lastBlockEnd &&
          cp < blockStart,
      )
      .forEach((cp) => {
        items.push({ type: "checkpoint", timestamp: cp });
      });

    items.push({ type: "transcript", item });
    lastBlockEnd = formatTime(item.end);
  });

  sortedCheckpoints
    .filter((cp) => betweenBlockCheckpoints.has(cp) && cp > lastBlockEnd)
    .forEach((cp) => {
      items.push({ type: "checkpoint", timestamp: cp });
    });

  return (
    <div className="flex flex-col space-y-4">
      {items.map((item, index) => {
        if (item.type === "checkpoint") {
          return (
            <div
              key={`checkpoint-${index}`}
              className="flex items-center gap-2 text-sm text-neutral-500"
            >
              <div className="flex-1 h-px bg-neutral-200" />
              <div className="flex items-center gap-1">
                <FlagIcon className="size-3" />
                Added Checkpoint at {item.timestamp}
              </div>
              <div className="flex-1 h-px bg-neutral-200" />
            </div>
          );
        }

        const blockCheckpoints =
          checkpointMap.get(
            sortedItems.findIndex((block) => block === item.item),
          ) || [];

        return (
          <div
            key={`transcript-${index}`}
            className="flex flex-col bg-white rounded-lg p-3 border border-neutral-200"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{item.item.speaker}</span>
              <span className="text-xs text-neutral-500">
                {formatTime(item.item.start)}~{formatTime(item.item.end)}
              </span>
            </div>
            <p className="text-sm mt-1">{item.item.text}</p>
            {blockCheckpoints.map((cp, cpIndex) => (
              <div
                key={`block-checkpoint-${cpIndex}`}
                className="flex items-center gap-1 mt-2 text-xs text-neutral-500"
              >
                <FlagIcon className="size-3" />
                Added Checkpoint at {cp}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
