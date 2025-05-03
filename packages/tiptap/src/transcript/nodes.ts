import { Mark, mergeAttributes, Node } from "@tiptap/core";

export const SpeakerNode = Node.create({
  name: "speaker",
  group: "block",
});

export const SentenceNode = Node.create({
  name: "sentence",
  group: "inline",
});

export const WordNode = Node.create({
  name: "word",
  group: "inline",
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
