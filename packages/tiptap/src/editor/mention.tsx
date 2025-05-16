import { autoUpdate, computePosition, flip, limitShift, offset, shift, type VirtualElement } from "@floating-ui/dom";
import Mention from "@tiptap/extension-mention";
import { PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import { type SuggestionOptions } from "@tiptap/suggestion";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

// https://github.com/ueberdosis/tiptap/blob/main/demos/src/Nodes/Mention/React/MentionList.jsx
const Component = forwardRef((props: {
  items: string[];
  command: (item: { id: string }) => void;
}, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];

    if (item) {
      props.command({ id: item });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }

      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }

      if (event.key === "Enter") {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  return (
    <div className="dropdown-menu">
      {props.items.length
        ? props.items.map((item, index) => (
          <button
            className={index === selectedIndex ? "is-selected" : ""}
            key={index}
            onClick={() => selectItem(index)}
          >
            {item}
          </button>
        ))
        : <div className="item">No result</div>}
    </div>
  );
});

// https://github.com/ueberdosis/tiptap/blob/main/demos/src/Nodes/Mention/React/suggestion.js
const suggestion = (trigger: string): Omit<SuggestionOptions, "editor"> => {
  return {
    char: trigger,
    pluginKey: new PluginKey(`mention-${trigger}`),
    items: ({ query }) => {
      if (!query) {
        return ["123", "234", "345"];
      }

      return ["234", "345", "456"];
    },
    render: () => {
      let renderer: ReactRenderer;
      let cleanup: (() => void) | undefined;
      let floatingEl: HTMLElement;
      let referenceEl: VirtualElement;

      const update = () => {
        computePosition(referenceEl, floatingEl, {
          placement: "bottom-start",
          middleware: [offset(0), flip(), shift({ limiter: limitShift() })],
        }).then(({ x, y }) => {
          Object.assign(floatingEl.style, {
            left: `${x}px`,
            top: `${y}px`,
          });
        });
      };

      return {
        onStart: props => {
          renderer = new ReactRenderer(Component, {
            props,
            editor: props.editor,
          });

          floatingEl = renderer.element as HTMLElement;
          Object.assign(floatingEl.style, {
            position: "absolute",
            top: "0",
            left: "0",
          });
          document.body.appendChild(floatingEl);

          if (!props.clientRect) {
            return;
          }

          referenceEl = {
            getBoundingClientRect: () => props.clientRect?.() ?? new DOMRect(),
          };

          cleanup = autoUpdate(referenceEl, floatingEl, update);
          update();
        },

        onUpdate: props => {
          renderer.updateProps(props);
          if (props.clientRect) {
            referenceEl.getBoundingClientRect = () => props.clientRect?.() ?? new DOMRect();
          }
          update();
        },

        onKeyDown: props => {
          if (props.event.key === "Escape") {
            cleanup?.();
            floatingEl.remove();
            return true;
          }
          return renderer.component.onKeyDown(props);
        },

        onExit: () => {
          cleanup?.();
          floatingEl.remove();
          renderer.destroy();
        },
      };
    },
  };
};

export const mention = (trigger: string) =>
  Mention
    .extend({
      name: `mention-${trigger}`,
    })
    .configure({
      HTMLAttributes: {
        class: "mention",
      },
      suggestion: suggestion(trigger),
    });
