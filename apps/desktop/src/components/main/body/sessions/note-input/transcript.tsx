import { cn } from "@hypr/utils";
import { useMemo } from "react";
import * as persisted from "../../../../../store/tinybase/persisted";

import { useListener } from "../../../../../contexts/listener";

type WordWithType = {
  text: string;
  start_ms: number;
  end_ms: number;
  channel: number;
  isFinal: boolean;
};

export function TranscriptView({ sessionId }: { sessionId: string }) {
  const finalWords = useFinalWords(sessionId);
  const partialWordsByChannel = useListener((state) => state.partialWordsByChannel);

  const finalWordsArray = useMemo(() => Object.values(finalWords), [finalWords]);

  const wordsByChannel = (() => {
    const channels = new Map<number, WordWithType[]>();

    finalWordsArray.forEach((word) => {
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

    Object.entries(partialWordsByChannel).forEach(([channelStr, words]) => {
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
  })();

  const channelIds = Array.from(wordsByChannel.keys()).sort((a, b) => a - b);

  if (channelIds.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-20rem)]">
      {channelIds.map((channelId) => {
        const words = wordsByChannel.get(channelId) ?? [];
        return (
          <div key={channelId} className="flex flex-col gap-1">
            {channelIds.length > 1 && (
              <div className="text-xs font-medium text-muted-foreground">
                Channel {channelId}
              </div>
            )}
            <div className="text-sm leading-relaxed">
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
