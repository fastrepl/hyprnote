import { type CommandProps, Mark, mergeAttributes, Node } from "@tiptap/core";
import { Node as ProseMirrorNode } from "prosemirror-model";

import "./styles.css";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    speaker: {
      deleteSpeaker: () => ReturnType;
      moveSentenceToAdjacent: (direction: "prev" | "next") => ReturnType;
    };
    sentence: {
      deleteSentence: () => ReturnType;
    };
    word: {
      deleteWord: () => ReturnType;
      replaceWord: (newText: string) => ReturnType;
      searchAndReplaceWords: (searchText: string, replaceText: string) => ReturnType;
    };
  }
}

export const SpeakerNode = Node.create({
  name: "speaker",
  group: "block",
  content: "sentence+",

  addAttributes() {
    return {
      id: {
        default: null,
      },
      label: {
        default: "Speaker",
      },
      color: {
        default: "#e9ecef",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-type=\"speaker\"]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "speaker",
        class: "transcript-speaker",
        style: `background-color: ${HTMLAttributes.color || "#e9ecef"};`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      deleteSpeaker: () => ({ tr, dispatch }: CommandProps) => {
        const { $from, $to } = tr.selection;
        const nodePos = $from.before();

        if (dispatch) {
          tr.delete(nodePos, $to.after());
        }

        return true;
      },
      moveSentenceToAdjacent: (direction: "prev" | "next") => ({ tr, dispatch }: CommandProps) => {
        const { $from } = tr.selection;
        const sentencePos = $from.pos;
        const speakerPos = $from.before();

        if (dispatch) {
          // Logic to move sentence to adjacent speaker
          // This would need to be completed based on document structure
        }

        return true;
      },
    };
  },
});

export const SentenceNode = Node.create({
  name: "sentence",
  group: "block",
  content: "word+",

  addAttributes() {
    return {
      id: {
        default: null,
      },
      timestamp: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-type=\"sentence\"]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "sentence",
        class: "transcript-sentence",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      deleteSentence: () => ({ tr, dispatch }: CommandProps) => {
        const { $from, $to } = tr.selection;
        const sentencePos = $from.pos;

        if (dispatch) {
          tr.delete(sentencePos, $to.after());
        }

        return true;
      },
    };
  },
});

export const WordNode = Node.create({
  name: "word",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      text: {
        default: "",
      },
      start: {
        default: null,
      },
      end: {
        default: null,
      },
      id: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-type=\"word\"]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "word",
        class: "transcript-word",
      }),
      HTMLAttributes.text,
    ];
  },

  addCommands() {
    return {
      deleteWord: () => ({ tr, dispatch }: CommandProps) => {
        const { $from, $to } = tr.selection;
        const wordPos = $from.pos;

        if (dispatch) {
          tr.delete(wordPos, $to.after());
        }

        return true;
      },
      replaceWord: (newText: string) => ({ tr, dispatch }: CommandProps) => {
        const { $from, $to } = tr.selection;
        const wordPos = $from.pos;

        if (dispatch) {
          // Delete the word and insert a new one with updated text
          tr.delete(wordPos, $to.after());
          const node = tr.doc.type.schema.nodes.word.create({ text: newText });
          tr.insert(wordPos, node);
        }

        return true;
      },
      searchAndReplaceWords: (searchText: string, replaceText: string) => ({ state, tr, dispatch }: CommandProps) => {
        // Need to traverse the document to find words with matching text
        let hasReplaced = false;

        const { doc } = state;

        doc.descendants((node: ProseMirrorNode, pos: number) => {
          if (node.type.name === "word" && node.attrs.text === searchText) {
            if (dispatch) {
              tr.setNodeMarkup(pos, null, {
                ...node.attrs,
                text: replaceText,
              });
            }
            hasReplaced = true;
          }
        });

        return hasReplaced;
      },
    };
  },
});

export const ConfidenceMark = Mark.create({
  name: "confidence",

  addAttributes() {
    return {
      score: {
        default: 1,
        parseHTML: element => element.getAttribute("data-confidence-score") || 1,
        renderHTML: attributes => {
          if (!attributes.score) {
            return {};
          }

          const score = parseFloat(attributes.score);
          const opacity = Math.max(0.3, score);
          const fontWeight = Math.round(400 + (score * 300));

          return {
            "data-confidence-score": score,
            style: `opacity: ${opacity}; font-weight: ${fontWeight};`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-confidence-score]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },
});
