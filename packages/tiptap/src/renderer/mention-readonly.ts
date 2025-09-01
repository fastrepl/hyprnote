import { mergeAttributes, Node } from "@tiptap/core";

/**
 * Read-only mention node for the Renderer component.
 * This node only handles parsing and rendering of existing mentions,
 * without any interactive features like suggestions or dropdowns.
 */
export const mentionReadonly = Node.create({
  name: "mention",

  group: "inline",

  inline: true,

  selectable: false,

  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-id"),
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.id) {
            return {};
          }
          return { "data-id": attributes.id };
        },
      },
      type: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-type"),
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.type) {
            return {};
          }
          return { "data-type": attributes.type };
        },
      },
      label: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-label"),
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.label) {
            return {};
          }
          return { "data-label": attributes.label };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "a.mention[data-mention=\"true\"]",
        getAttrs: (dom: HTMLElement) => {
          const label = dom.getAttribute("data-label") || dom.textContent || "";
          return {
            id: dom.getAttribute("data-id"),
            type: dom.getAttribute("data-type"),
            label: label,
          };
        },
      },
      {
        tag: "a.mention",
        getAttrs: (dom: HTMLElement) => {
          const label = dom.getAttribute("data-label") || dom.textContent || "";
          return {
            id: dom.getAttribute("data-id"),
            type: dom.getAttribute("data-type"),
            label: label,
          };
        },
      },
      {
        tag: "span.mention",
        getAttrs: (dom: HTMLElement) => {
          const label = dom.getAttribute("data-label") || dom.textContent || "";
          return {
            id: dom.getAttribute("data-id"),
            type: dom.getAttribute("data-type"),
            label: label,
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const label = node.attrs.label || "";
    const nodeText = node.textContent || label;
    const classes = ["mention"];

    // Add selection-ref class if this is a selection reference
    if (label.includes("[") && label.includes("]")) {
      classes.push("selection-ref");
    }

    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: classes.join(" "),
        "data-mention": "true",
        "data-id": node.attrs.id,
        "data-type": node.attrs.type,
        "data-label": node.attrs.label,
      }),
      nodeText.startsWith("@") ? nodeText : `@${nodeText}`,
    ];
  },

  renderText({ node }) {
    const label = node.attrs.label || "";
    return label.startsWith("@") ? label : `@${label}`;
  },
});
