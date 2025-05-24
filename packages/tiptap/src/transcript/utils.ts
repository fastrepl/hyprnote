import type { SpeakerIdentity, Word } from "@hypr/plugin-db";
import { JSONContent } from "@tiptap/react";

export type { Word };

export type DocContent = {
  type: string;
  content: SpeakerContent[];
};

const SPEAKER_ID_ATTR = "speaker-id";
const SPEAKER_INDEX_ATTR = "speaker-index";
const SPEAKER_LABEL_ATTR = "speaker-label";

type SpeakerContent = {
  type: "speaker";
  content: WordContent[];
  attrs: {
    [SPEAKER_INDEX_ATTR]: number | null;
    [SPEAKER_ID_ATTR]: string | null;
    [SPEAKER_LABEL_ATTR]: string | null;
  };
};

type WordContent = {
  type: "word";
  content: { type: "text"; text: string }[];
  attrs?: {
    start_ms?: number | null;
    end_ms?: number | null;
    confidence?: number | null;
  };
};

export const fromWordsToEditor = (words: Word[]): DocContent => {
  return {
    type: "doc",
    content: words.reduce<{ cur: SpeakerIdentity | null; acc: SpeakerContent[] }>((state, word) => {
      const isFirst = state.acc.length === 0;

      const isSameSpeaker = (!state.cur && !word.speaker)
        || (state.cur?.type === "unassigned" && word.speaker?.type === "unassigned"
          && state.cur.value.index === word.speaker.value.index)
        || (state.cur?.type === "assigned" && word.speaker?.type === "assigned"
          && state.cur.value.id === word.speaker.value.id);

      if (isFirst || !isSameSpeaker) {
        state.cur = word.speaker;

        state.acc.push({
          type: "speaker",
          attrs: {
            [SPEAKER_INDEX_ATTR]: word.speaker?.type === "unassigned" ? word.speaker.value?.index : null,
            [SPEAKER_ID_ATTR]: word.speaker?.type === "assigned" ? word.speaker.value?.id : null,
            [SPEAKER_LABEL_ATTR]: word.speaker?.type === "assigned" ? word.speaker.value?.label || "" : null,
          },
          content: [],
        });
      }

      if (state.acc.length > 0) {
        state.acc[state.acc.length - 1].content.push({
          type: "word",
          content: [{ type: "text", text: word.text }],
          attrs: {
            confidence: word.confidence ?? null,
            start_ms: word.start_ms ?? null,
            end_ms: word.end_ms ?? null,
          },
        });
      }

      return state;
    }, { cur: null, acc: [] }).acc,
  };
};

export const fromEditorToWords = (content: DocContent | JSONContent): Word[] => {
  if (!content?.content) {
    return [];
  }

  const words: Word[] = [];

  for (const speakerBlock of content.content) {
    if (speakerBlock.type !== "speaker" || !speakerBlock.content) {
      continue;
    }

    let speaker: SpeakerIdentity | null = null;
    const attrs = speakerBlock.attrs || {};

    if (attrs[SPEAKER_ID_ATTR]) {
      speaker = {
        type: "assigned",
        value: {
          id: attrs[SPEAKER_ID_ATTR],
          label: attrs[SPEAKER_LABEL_ATTR] ?? "",
        },
      };
    } else if (typeof attrs[SPEAKER_INDEX_ATTR] === "number") {
      speaker = {
        type: "unassigned",
        value: {
          index: attrs[SPEAKER_INDEX_ATTR],
        },
      };
    }

    for (const wordBlock of speakerBlock.content) {
      if (wordBlock.type !== "word" || !wordBlock.content?.[0]?.text) {
        continue;
      }
      const wordAttrs = wordBlock.attrs || {};
      words.push({
        text: wordBlock.content[0].text,
        speaker,
        confidence: wordAttrs.confidence ?? null,
        start_ms: wordAttrs.start_ms ?? null,
        end_ms: wordAttrs.end_ms ?? null,
      });
    }
  }

  return words;
};
