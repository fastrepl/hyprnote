import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import clsx from "clsx";

import { type Editor } from "@tiptap/core";
import TiptapMention from "@tiptap/extension-mention";

import { tagSuggestion } from "./tags";

// https://tiptap.dev/docs/examples/advanced/mentions
// https://github.com/fastrepl/fastrepl/blob/main/assets/lib/tiptap/mention.ts

export interface MentionArgs {
  trigger: string;
}

export const Mention = (args: MentionArgs) => {
  const { trigger } = args;

  return TiptapMention.extend({
    name: `mention-${trigger}`,
  }).configure({
    suggestion: tagSuggestion(args),
    deleteTriggerWithBackspace: true,
    renderHTML(props) {
      const { node } = props;
      return [
        "span",
        {
          "data-hypr-exclude": true,
          class: clsx("before:content-['#'] underline text-yellow-600 "),
        },
        node.attrs.id,
      ];
    },
  });
};
export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface MentionListProps {
  items: string[];
  command: (props: { id: string }) => void;
  editor: Editor;
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  (props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = props.items[index];

      if (item) {
        props.command({ id: item });
      }
    };

    const upHandler = () => {
      setSelectedIndex(
        (selectedIndex + props.items.length - 1) % props.items.length,
      );
    };

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    useEffect(() => setSelectedIndex(0), [props.items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          upHandler();
          return true;
        }

        if (event.key === "ArrowDown") {
          downHandler();
          return true;
        }

        // TODO: not work
        if (event.key === "Enter") {
          enterHandler();
          return true;
        }

        return false;
      },
    }));

    return (
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg shadow-md flex flex-col gap-0.5 overflow-auto p-1.5 relative">
        {props.items.map((item, index) => (
          <button
            className={clsx(
              "flex items-center gap-1 w-full text-left bg-transparent",
              index === selectedIndex ? "bg-neutral-400" : "",
              "hover:bg-neutral-300",
            )}
            key={index}
            type="button"
            onClick={() => selectItem(index)}
            onKeyDown={(e) => e.preventDefault()}
          >
            {item}
          </button>
        ))}
      </div>
    );
  },
);
