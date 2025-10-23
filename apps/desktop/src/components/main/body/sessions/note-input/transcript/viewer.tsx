import { useMemo } from "react";

import { cn } from "@hypr/utils";
import { useListener } from "../../../../../../contexts/listener";
import * as persisted from "../../../../../../store/tinybase/persisted";

type MaybePartialWord = Omit<
  persisted.Word & { isFinal: boolean },
  "transcript_id" | "user_id" | "created_at"
>;

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

function useMergedWordsByChannel(
  finalWords: Record<string, persisted.Word>,
  partialWords: Record<string, Array<{ text: string; start_ms: number; end_ms: number; channel: number }>>,
) {
  return useMemo(() => {
    const channels = new Map<number, MaybePartialWord[]>();

    Object.values(finalWords).forEach((word) => {
      const channelWords = channels.get(word.channel) ?? [];
      channelWords.push({
        text: word.text,
        start_ms: word.start_ms,
        end_ms: word.end_ms,
        channel: word.channel,
        isFinal: true,
      });
      channels.set(word.channel, channelWords);
    });

    Object.entries(partialWords).forEach(([channelStr, words]) => {
      const channel = Number(channelStr);
      const channelWords = channels.get(channel) ?? [];
      words.forEach((word) => {
        channelWords.push({
          text: word.text,
          start_ms: word.start_ms,
          end_ms: word.end_ms,
          channel: word.channel,
          isFinal: false,
        });
      });
      channels.set(channel, channelWords);
    });

    channels.forEach((words, channel) => {
      channels.set(
        channel,
        words.sort((a, b) => a.start_ms - b.start_ms),
      );
    });

    return channels;
  }, [finalWords, partialWords]);
}

function usePartialWords() {
  return useListener((state) => state.partialWordsByChannel);
}

function useFinalWords(sessionId: string) {
  const store = persisted.UI.useStore(persisted.STORE_ID);

  const transcriptIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.transcriptBySession,
    sessionId,
    persisted.STORE_ID,
  );
  const transcriptId = transcriptIds?.[0];

  const wordIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.wordsByTranscript,
    transcriptId,
    persisted.STORE_ID,
  );

  return useMemo(() => {
    if (!store) {
      return {};
    }

    const words: Record<string, persisted.Word> = {};
    wordIds?.forEach((wordId) => {
      const word = store.getRow("words", wordId);
      if (word) {
        words[wordId] = word as persisted.Word;
      }
    });
    return words;
  }, [store, wordIds]);
}
