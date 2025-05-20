import type { SpeakerIdentity, Word } from "@hypr/plugin-db";
import { EditorContent } from "@tiptap/react";

export type { Word };

type EditorContent = {
  type: "doc";
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

export const fromWordsToEditor = (words: Word[]): EditorContent => {
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

export const fromEditorToWords = (content: EditorContent): Word[] => {
  if (!content?.content) {
    return [];
  }

  const words: Word[] = [];

  for (const speakerBlock of content.content) {
    if (speakerBlock.type !== "speaker" || !speakerBlock.content) {
      continue;
    }

    let speaker: SpeakerIdentity | null = null;
    if (speakerBlock.attrs[SPEAKER_ID_ATTR]) {
      speaker = {
        type: "assigned",
        value: {
          id: speakerBlock.attrs[SPEAKER_ID_ATTR],
          label: speakerBlock.attrs[SPEAKER_LABEL_ATTR] ?? "",
        },
      };
    } else if (typeof speakerBlock.attrs[SPEAKER_INDEX_ATTR] === "number") {
      speaker = {
        type: "unassigned",
        value: {
          index: speakerBlock.attrs[SPEAKER_INDEX_ATTR],
        },
      };
    }

    for (const wordBlock of speakerBlock.content) {
      if (wordBlock.type !== "word" || !wordBlock.content?.[0]?.text) {
        continue;
      }
      const attrs = wordBlock.attrs || {};
      words.push({
        text: wordBlock.content[0].text,
        speaker,
        confidence: attrs.confidence ?? null,
        start_ms: attrs.start_ms ?? null,
        end_ms: attrs.end_ms ?? null,
      });
    }
  }

  return words;
};
