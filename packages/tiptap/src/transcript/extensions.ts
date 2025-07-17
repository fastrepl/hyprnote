import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";

import { SPEAKER_NODE_NAME } from "./nodes";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    transcriptCommands: {
      serialize: () => ReturnType;
    };
  }
}

export const SpeakerSplit = Extension.create({
  name: "speakerSplit",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("hypr-speaker-split"),
        props: {
          handleKeyDown(view, event) {
            // Handle Enter key for splitting speakers
            if (checkKey("Enter")(event)) {
              const { state, dispatch } = view;
              const { selection } = state;

              if (!selection.empty) {
                return false;
              }

              const $from = selection.$from;

              const parentOffset = $from.parentOffset;
              const textContent = $from.parent.textContent;

              let splitPos = $from.before() + parentOffset + 1;

              if (parentOffset < textContent.length) {
                const beforeChar = parentOffset > 0 ? textContent[parentOffset - 1] : " ";
                const afterChar = parentOffset < textContent.length ? textContent[parentOffset] : " ";

                if (beforeChar !== " " && afterChar !== " ") {
                  let wordStart = parentOffset;
                  while (wordStart > 0 && textContent[wordStart - 1] !== " ") {
                    wordStart--;
                  }

                  splitPos = $from.before() + wordStart + 1;
                }
              }

              const currentSpeakerNode = $from.node($from.depth);
              const speakerAttrs = currentSpeakerNode.type.name === SPEAKER_NODE_NAME
                ? currentSpeakerNode.attrs
                : {};

              const tr = state.tr.split(splitPos, 1, [
                { type: state.schema.nodes[SPEAKER_NODE_NAME], attrs: speakerAttrs },
              ]);

              const newPos = tr.mapping.map(splitPos);
              const newSelection = TextSelection.create(tr.doc, newPos);

              dispatch(tr.setSelection(newSelection).scrollIntoView());
              return true;
            }

            // Handle Up/Down arrow keys for smart section navigation
            if (checkKey("ArrowUp")(event) || checkKey("ArrowDown")(event)) {
              const { state } = view;
              const { selection } = state;
              const { doc } = state;
              const isUp = event.key === "ArrowUp";

              // Find all speaker sections
              const speakerSections: { pos: number; node: any; startPos: number; endPos: number }[] = [];
              doc.descendants((node, pos) => {
                if (node.type.name === SPEAKER_NODE_NAME) {
                  speakerSections.push({
                    pos,
                    node,
                    startPos: pos + 1, // Content starts after the node opening
                    endPos: pos + node.nodeSize - 1, // Content ends before the node closing
                  });
                }
                return false; // Don't descend into speaker nodes
              });

              if (speakerSections.length < 2) {
                return false; // Need at least 2 sections to navigate
              }

              // Find current speaker section
              const currentPos = selection.from;
              let currentSection: typeof speakerSections[0] | null = null;
              let currentSectionIndex = -1;

              for (let i = 0; i < speakerSections.length; i++) {
                const section = speakerSections[i];
                if (currentPos >= section.startPos && currentPos <= section.endPos) {
                  currentSection = section;
                  currentSectionIndex = i;
                  break;
                }
              }

              if (!currentSection || currentSectionIndex === -1) {
                return false; // Not within a speaker section
              }

              // Check if we're at the edge of the current section
              const { $from } = selection;
              const isAtEdge = isUp
                ? currentPos === currentSection.startPos || $from.parentOffset === 0
                : currentPos === currentSection.endPos || $from.parentOffset === $from.parent.content.size;

              // Only navigate between sections if we're at the edge
              if (!isAtEdge) {
                return false; // Let default line navigation handle this
              }

              // We're at the edge, so navigate to adjacent section
              let targetSectionIndex: number;
              if (isUp) {
                targetSectionIndex = currentSectionIndex > 0 ? currentSectionIndex - 1 : speakerSections.length - 1;
              } else {
                targetSectionIndex = currentSectionIndex < speakerSections.length - 1 ? currentSectionIndex + 1 : 0;
              }

              const targetSection = speakerSections[targetSectionIndex];
              let targetPos: number;

              if (isUp) {
                // When going up, go to the end of the previous section
                targetPos = targetSection.endPos;
              } else {
                // When going down, go to the beginning of the next section
                targetPos = targetSection.startPos;
              }

              const newSelection = TextSelection.create(doc, targetPos);
              view.dispatch(state.tr.setSelection(newSelection).scrollIntoView());
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});

const checkKey = (key: string) => (e: KeyboardEvent) => {
  return e.key === key
    && !e.ctrlKey
    && !e.metaKey
    && !e.altKey
    && !e.shiftKey; // Also ignore shift key for cleaner navigation
};
