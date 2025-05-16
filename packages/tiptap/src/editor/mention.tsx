import { autoUpdate, computePosition, flip, limitShift, offset, shift, type VirtualElement } from "@floating-ui/dom";
import Mention from "@tiptap/extension-mention";
import { PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import { type SuggestionOptions } from "@tiptap/suggestion";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

const GLOBAL_NAVIGATE_FUNCTION = "__HYPR_NAVIGATE__";

export interface MentionItem {
  id: string;
  type: string;
  label: string;
}

// https://github.com/ueberdosis/tiptap/blob/main/demos/src/Nodes/Mention/React/MentionList.jsx
const Component = forwardRef((props: {
  items: MentionItem[];
  command: (item: MentionItem) => void;
}, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];

    if (item) {
      props.command(item);
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
            {item.label}
          </button>
        ))
        : <div className="item">No result</div>}
    </div>
  );
});

// https://github.com/ueberdosis/tiptap/blob/main/demos/src/Nodes/Mention/React/suggestion.js
const suggestion = (
  trigger: string,
  handleMentionSearch: (query: string) => MentionItem[],
): Omit<SuggestionOptions, "editor"> => {
  return {
    char: trigger,
    pluginKey: new PluginKey(`mention-${trigger}`),
    items: ({ query }) => {
      if (!query) {
        return [];
      }

      return handleMentionSearch(query).slice(0, 3);
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

export const mention = (trigger: string, handleMentionSearch: (query: string) => MentionItem[]) => {
  return Mention
    .extend({
      name: `mention-${trigger}`,
      addAttributes() {
        return {
          id: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-id"),
            renderHTML: (attributes) => ({ "data-id": attributes.id }),
          },
          type: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-type"),
            renderHTML: (attributes) => ({ "data-type": attributes.type }),
          },
          label: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-label"),
            renderHTML: (attributes) => ({ "data-label": attributes.label }),
          },
        };
      },
    })
    .configure({
      deleteTriggerWithBackspace: true,
      suggestion: suggestion(trigger, handleMentionSearch),
      renderHTML: ({ node }) => {
        const { attrs: { id, type, label } } = node;
        const path = `/app/${type}/${id}`;

        return [
          "a",
          {
            class: "mention",
            "data-type": type,
            "data-id": id,
            "data-label": label,
            href: "javascript:void(0)",
            onclick:
              `event.preventDefault(); if (window.${GLOBAL_NAVIGATE_FUNCTION}) window.${GLOBAL_NAVIGATE_FUNCTION}('${path}');`,
          },
          `${trigger}${label}`,
        ];
      },
      HTMLAttributes: {
        class: "mention",
      },
    });
};
