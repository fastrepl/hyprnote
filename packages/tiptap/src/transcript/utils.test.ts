import { expect, test } from "vitest";

import { fromEditorToWords, fromWordsToEditor, type Word2 } from "./utils";

test("conversion", () => {
  const words: Word2[] = [
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
    {
      text: "world",
      speaker: {
        type: "unassigned",
        value: {
          index: 0,
        },
      },
      confidence: 0.8,
      start_ms: 1000,
      end_ms: 2000,
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
            "text": "Hello",
            "type": "text",
            "marks": [
              {
                "attrs": {
                  "confidence": 0.5,
                },
                "type": "confidence",
              },
            ],
          },
          {
            "text": " ",
            "type": "text",
          },
          {
            "text": "world",
            "type": "text",
            "marks": [
              {
                "attrs": {
                  "confidence": 0.8,
                },
                "type": "confidence",
              },
            ],
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
  expect(words2).toEqual([
    {
      text: "Hello",
      speaker: {
        type: "unassigned",
        value: {
          index: 0,
        },
      },
      confidence: 0.5,
      start_ms: null,
      end_ms: null,
    },
    {
      text: "world",
      speaker: {
        type: "unassigned",
        value: {
          index: 0,
        },
      },
      confidence: 0.8,
      start_ms: null,
      end_ms: null,
    },
  ]);
});
