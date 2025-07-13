import type { SpeakerIdentity, Word } from "@hypr/plugin-db";
import { JSONContent } from "@tiptap/react";

export type { Word };

export const SPEAKER_ID_ATTR = "speaker-id" as const;
export const SPEAKER_INDEX_ATTR = "speaker-index" as const;
export const SPEAKER_LABEL_ATTR = "speaker-label" as const;

export interface SpeakerAttributes {
  [SPEAKER_INDEX_ATTR]: number | null;
  [SPEAKER_ID_ATTR]: string | null;
  [SPEAKER_LABEL_ATTR]: string | null;
}

export type SpeakerAttrKey = keyof SpeakerAttributes;

export type DocContent = {
  type: string;
  content: SpeakerContent[];
};

type SpeakerContent = {
  type: "speaker";
  content: { type: "text"; text: string }[];
  attrs: SpeakerAttributes;
};

export const fromWordsToEditor = (words: Word[]): DocContent => {
  return {
    type: "doc",
    content: words.reduce<{ cur: SpeakerIdentity | null; acc: SpeakerContent[] }>((state, word, index) => {
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

      const lastSpeaker = state.acc[state.acc.length - 1];

      // If there's already text content, add a space before the new word
      if (lastSpeaker.content.length > 0 && lastSpeaker.content[0].text) {
        lastSpeaker.content[0].text += " " + word.text;
      } else {
        lastSpeaker.content.push({ type: "text", text: word.text });
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

    const textContent = speakerBlock.content
      .filter(node => node.type === "text")
      .map(node => node.text || "")
      .join("");

    const wordTexts = textContent.split(/\s+/).filter(Boolean);

    for (const wordText of wordTexts) {
      words.push({
        text: wordText,
        speaker,
        confidence: null,
        start_ms: null,
        end_ms: null,
      });
    }
  }

  return words;
};

export const getSpeakerLabel = (attrs: Partial<SpeakerAttributes>): string => {
  if (attrs[SPEAKER_LABEL_ATTR]) {
    return attrs[SPEAKER_LABEL_ATTR];
  } else if (attrs[SPEAKER_ID_ATTR]) {
    return attrs[SPEAKER_ID_ATTR];
  } else if (typeof attrs[SPEAKER_INDEX_ATTR] === "number") {
    if (attrs[SPEAKER_INDEX_ATTR] === 0) {
      return "You";
    }
    return `Speaker ${attrs[SPEAKER_INDEX_ATTR]}`;
  } else {
    return "Unknown Speaker";
  }
};
