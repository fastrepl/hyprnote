import { expect, test } from "vitest";

import { fromEditorToWords, fromWordsToEditor, type Word } from "./utils";

test("conversion", () => {
  const words: Word[] = [
    {
      text: "Hello",
      speaker: {
        type: "unassigned",
        value: {
          index: 0,
        },
      },
      confidence: 0.5,
      start_ms: 0,
      end_ms: 1000,
    },
  ];

  const editorContent = fromWordsToEditor(words);
  const words2 = fromEditorToWords(editorContent);
  expect(words2).toEqual(words);
});
