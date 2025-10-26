import { cn } from "@hypr/utils";
import { type MaybePartialWord, useFinalWords, useMergedWordsByChannel, usePartialWords } from "./segment";

export function TranscriptViewer({ sessionId }: { sessionId: string }) {
  const finalWords = useFinalWords(sessionId);
  const partialWords = usePartialWords();
  const wordsByChannel = useMergedWordsByChannel(finalWords, partialWords);

  return <Renderer wordsByChannel={wordsByChannel} />;
}

function Renderer({ wordsByChannel }: { wordsByChannel: Map<number, MaybePartialWord[]> }) {
  const channelIds = Array.from(wordsByChannel.keys()).sort((a, b) => a - b);

  if (channelIds.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col overflow-y-auto overflow-x-hidden max-h-[calc(100vh-250px)]">
      {channelIds.map((channelId) => {
        const words = wordsByChannel.get(channelId) ?? [];
        return (
          <div key={channelId} className="flex flex-col">
            <div
              className={cn([
                "sticky top-0 z-10",
                "py-2 px-3 -mx-3",
                "bg-background",
                "border-b border-border",
                "text-sm font-semibold",
              ])}
            >
              Channel {channelId}
            </div>
            <div className="text-sm leading-relaxed py-4 break-words overflow-wrap-anywhere">
              {words.map((word, idx) => (
                <span
                  key={`${word.start_ms}-${idx}`}
                  className={cn([
                    !word.isFinal && ["opacity-60", "italic"],
                  ])}
                >
                  {word.text}
                  {" "}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
