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

  const editor = fromWordsToEditor(words);
  expect(editor).toEqual({
    "type": "doc",
    "content": [
      {
        "type": "speaker",
        "content": [
          {
            "attrs": {
              "confidence": 0.5,
              "end_ms": 1000,
              "start_ms": 0,
            },
            "content": [
              {
                "text": "Hello",
                "type": "text",
              },
            ],
            "type": "word",
          },
        ],
        "attrs": {
          "speaker-id": null,
          "speaker-index": 0,
          "speaker-label": null,
        },
      },
    ],
  });

  const words2 = fromEditorToWords(editor);
  expect(words2).toEqual(words);
});
