import { Extension } from "@tiptap/core";
import { Fragment } from "prosemirror-model";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";

import { SpeakerContentNode, SpeakerLabelNode, SpeakerNode, WordNode } from "./nodes";

const ZERO_WIDTH_SPACE = "\u200B";

export const WordSplit = Extension.create({
  name: "hypr-word-split",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("hypr-word-split"),
        props: {
          handleKeyDown(view, event) {
            if (
              event.key === " "
              && !event.ctrlKey
              && !event.metaKey
              && !event.altKey
            ) {
              const { state, dispatch } = view;
              const { selection } = state;

              if (!selection.empty) {
                return false;
              }

              const $pos = selection.$from;
              const WORD_NODE_TYPE = state.schema.nodes[WordNode.name];

              if ($pos.parent.type !== WORD_NODE_TYPE) {
                return false;
              }

              if ($pos.parent.textContent === ZERO_WIDTH_SPACE) {
                event.preventDefault();
                return true;
              }

              event.preventDefault();

              const posAfter = $pos.after();

              let transaction = state.tr.insert(
                posAfter,
                WORD_NODE_TYPE.create(
                  null,
                  state.schema.text(ZERO_WIDTH_SPACE),
                ),
              );
              const cursor = TextSelection.create(transaction.doc, posAfter + 2);
              transaction = transaction.setSelection(cursor);

              dispatch(transaction.scrollIntoView());
              return true;
            }

            if (
              event.key === "Backspace"
              && !event.ctrlKey
              && !event.metaKey
              && !event.altKey
            ) {
              const { state, dispatch } = view;
              const { selection } = state;

              if (!selection.empty) {
                return false;
              }

              const $from = selection.$from;
              const WORD_NODE_TYPE = state.schema.nodes[WordNode.name];

              if ($from.parent.type !== WORD_NODE_TYPE) {
                return false;
              }

              if ($from.parentOffset > 0) {
                event.preventDefault();

                dispatch(
                  state.tr
                    .delete($from.pos - 1, $from.pos)
                    .scrollIntoView(),
                );

                return true;
              }

              return false;
            }

            return false;
          },

          handlePaste(view, event) {
            const text = event.clipboardData?.getData("text/plain")?.trim() ?? "";
            if (!text) {
              return false;
            }

            const words = text.split(/\s+/).filter(Boolean);
            if (words.length <= 1) {
              return false;
            }

            const { state, dispatch } = view;
            const wordType = state.schema.nodes.word;

            const nodes = words.map((w) => wordType.create(null, state.schema.text(w)));

            let tr = state.tr.deleteSelection();
            let insertPos = tr.selection.from;
            nodes.forEach((node) => {
              tr.insert(insertPos, node);
              insertPos += node.nodeSize;
            });

            dispatch(tr.scrollIntoView());
            return true;
          },
        },
      }),
    ];
  },
});

export const SpeakerSplit = Extension.create({
  name: "SpeakerSplit",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("hypr-speaker-split"),
        props: {
          handleKeyDown(view, event) {
            if (
              event.key === "Enter"
              && !event.ctrlKey
              && !event.metaKey
              && !event.altKey
            ) {
              const { state, dispatch } = view;
              const { selection } = state;

              if (!selection.empty) {
                return false;
              }

              const { $from } = selection;
              const {
                [SpeakerNode.name]: speakerType,
                [SpeakerContentNode.name]: speakerContentType,
                [SpeakerLabelNode.name]: speakerLabelType,
                [WordNode.name]: wordType,
              } = state.schema.nodes as Record<string, any>;

              let speakerContentDepth = $from.depth;
              while (
                speakerContentDepth > 0
                && $from.node(speakerContentDepth).type !== speakerContentType
              ) {
                speakerContentDepth--;
              }
              if (
                speakerContentDepth < 0
                || $from.node(speakerContentDepth).type !== speakerContentType
              ) {
                return false;
              }

              let speakerDepth = speakerContentDepth;
              while (
                speakerDepth > 0
                && $from.node(speakerDepth).type !== speakerType
              ) {
                speakerDepth--;
              }
              if (
                speakerDepth < 0
                || $from.node(speakerDepth).type !== speakerType
              ) {
                return false;
              }

              const speakerContentStart = $from.start(speakerContentDepth);
              const speakerContentEnd = $from.end(speakerContentDepth);

              const movedFragment = speakerContentEnd > selection.from
                ? state.doc.slice(selection.from, speakerContentEnd).content
                : null;

              const labelNode = speakerLabelType.create(
                null,
                state.schema.text("Unknown"),
              );

              const contentNode = speakerContentType.create(
                null,
                movedFragment && movedFragment.size > 0
                  ? movedFragment
                  : Fragment.from(
                    wordType.create(
                      null,
                      state.schema.text(ZERO_WIDTH_SPACE),
                    ),
                  ),
              );

              const newSpeaker = speakerType.create(
                { label: "Unknown" },
                [labelNode, contentNode],
              );

              let tr = state.tr;

              if (speakerContentEnd > selection.from) {
                tr = tr.delete(selection.from, speakerContentEnd);
              }

              const speakerEndMapped = tr.mapping.map($from.end(speakerDepth));

              tr = tr.insert(speakerEndMapped, newSpeaker);

              const cursorPos = speakerEndMapped
                + 1
                + labelNode.nodeSize
                + 1;
              tr = tr.setSelection(TextSelection.create(tr.doc, cursorPos));

              dispatch(tr.scrollIntoView());
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});
