import { mergeAttributes, Node } from "@tiptap/core";

export const SpeakerLabelNode = Node.create({
  name: "speakerLabel",
  group: "block",
  content: "text*",
  parseHTML() {
    return [{ tag: "div.transcript-speaker-label" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({
        class: "transcript-speaker-label",
        contenteditable: "false",
      }, HTMLAttributes),
      0,
    ];
  },
});

export const SpeakerContentNode = Node.create({
  name: "speakerContent",
  group: "block",
  content: "word*",
  parseHTML() {
    return [{ tag: "div.transcript-speaker-content" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ class: "transcript-speaker-content" }, HTMLAttributes), 0];
  },
});

export const SpeakerNode = Node.create({
  name: "speaker",
  group: "block",
  content: "speakerContent+",
  addAttributes() {
    return {
      label: {
        default: "Unknown",
        parseHTML: element => element.getAttribute("data-speaker-label") || "Unknown",
        renderHTML: attributes => {
          return { "data-speaker-label": attributes.label };
        },
      },
      speakers: {
        default: [],
        parseHTML: element => {
          try {
            return JSON.parse(element.getAttribute("data-speakers") || "[]");
          } catch (e) {
            return [];
          }
        },
        renderHTML: attributes => {
          return { "data-speakers": JSON.stringify(attributes.speakers || []) };
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: "div.transcript-speaker" }];
  },
  renderHTML({ HTMLAttributes, node }) {
    const label = HTMLAttributes["data-speaker-label"] || "Unknown";
    const speakers = JSON.parse(HTMLAttributes["data-speakers"] || "['Unknown']");

    const selectElement = [
      "select",
      {
        class: "transcript-speaker-select",
        contenteditable: "false",
      },
      ["option", { value: "Unknown", selected: label === "Unknown" }, "Unknown"],
      ...speakers.map((speaker: string) => [
        "option",
        { value: speaker, selected: label === speaker },
        speaker,
      ]),
    ];

    return [
      "div",
      mergeAttributes({ class: "transcript-speaker" }, HTMLAttributes),
      selectElement,
      ["div", { class: "transcript-speaker-content-wrapper" }, 0],
    ];
  },
});

export const WordNode = Node.create({
  name: "word",
  group: "inline",
  inline: true,
  atom: false,
  content: "text*",
  parseHTML() {
    return [{ tag: "span.transcript-word" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes({ class: "transcript-word" }, HTMLAttributes), 0];
  },
});
