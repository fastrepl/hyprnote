import { Component, createElement, type ReactElement } from "react";
import ReactDOM from "react-dom/client";

import { type Editor, Extension, isNodeEmpty } from "@tiptap/core";
import type { Node as ProsemirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export type PlaceholderFunction = (props: {
  editor: Editor;
  node: ProsemirrorNode;
  pos: number;
  hasAnchor: boolean;
}) => ReactElement | string;

export interface PlaceholderOptions {
  emptyEditorClass: string;
  emptyNodeClass: string;
  placeholder:
    | ((props: {
      editor: Editor;
      node: ProsemirrorNode;
      pos: number;
      hasAnchor: boolean;
    }) => ReactElement | string)
    | ReactElement
    | string;
  showOnlyWhenEditable: boolean;
  showOnlyCurrent: boolean;
  includeChildren: boolean;
}

export const Placeholder = Extension.create<PlaceholderOptions>({
  name: "hypr-placeholder",

  addOptions() {
    return {
      emptyEditorClass: "is-editor-empty",
      emptyNodeClass: "is-empty",
      placeholder: "Write something …",
      showOnlyWhenEditable: true,
      showOnlyCurrent: true,
      includeChildren: false,
    };
  },

  addProseMirrorPlugins() {
    const containers = new Map<number, { container: HTMLElement; root: ReactDOM.Root }>();

    const scheduleReactRender = (root: ReactDOM.Root, element: ReactElement) => {
      queueMicrotask(() => root.render(element));
    };

    return [
      new Plugin({
        key: new PluginKey("reactPlaceholder"),
        props: {
          decorations: ({ doc, selection }) => {
            const active = this.editor.isEditable || !this.options.showOnlyWhenEditable;
            const { anchor } = selection;
            const decorations: Decoration[] = [];

            if (!active) {
              return null;
            }

            const isEmptyDoc = this.editor.isEmpty;
            const seenPositions = new Set<number>();

            doc.descendants((node, pos) => {
              const hasAnchor = anchor >= pos && anchor <= pos + node.nodeSize;
              const isEmpty = !node.isLeaf && isNodeEmpty(node);

              if ((hasAnchor || !this.options.showOnlyCurrent) && isEmpty) {
                seenPositions.add(pos);
                const classes = [this.options.emptyNodeClass];
                if (isEmptyDoc) {
                  classes.push(this.options.emptyEditorClass);
                }

                const placeholderContent = typeof this.options.placeholder === "function"
                  ? this.options.placeholder({
                    editor: this.editor,
                    node,
                    pos,
                    hasAnchor,
                  })
                  : this.options.placeholder;

                if (
                  typeof placeholderContent === "object"
                  && placeholderContent !== null
                  && "type" in placeholderContent
                ) {
                  const wrappedContent = createElement(
                    PlaceholderErrorBoundary,
                    null,
                    placeholderContent as ReactElement,
                  );

                  const decoration = Decoration.widget(
                    pos + 1,
                    () => {
                      const existing = containers.get(pos);
                      if (existing) {
                        scheduleReactRender(existing.root, wrappedContent);
                        return existing.container;
                      }

                      const container = document.createElement("span");
                      container.className = `${classes.join(" ")} react-placeholder-widget`;
                      container.contentEditable = "false";

                      const root = ReactDOM.createRoot(container);
                      containers.set(pos, { container, root });
                      scheduleReactRender(root, wrappedContent);

                      return container;
                    },
                    {
                      destroy: () => {
                        setTimeout(() => {
                          const existing = containers.get(pos);
                          if (existing && !seenPositions.has(pos)) {
                            existing.root.unmount();
                            containers.delete(pos);
                          }
                        }, 0);
                      },
                      side: -1,
                    },
                  );
                  decorations.push(decoration);
                } else {
                  const decoration = Decoration.node(pos, pos + node.nodeSize, {
                    class: classes.join(" "),
                    "data-placeholder": placeholderContent as string,
                  });

                  decorations.push(decoration);
                }
              }

              return this.options.includeChildren;
            });

            return DecorationSet.create(doc, decorations);
          },
        },
        view() {
          return {
            destroy() {
              setTimeout(() => {
                containers.forEach(({ root }) => root.unmount());
                containers.clear();
              }, 0);
            },
          };
        },
      }),
    ];
  },
});

type PlaceholderErrorBoundaryProps = { children: ReactElement };
type PlaceholderErrorBoundaryState = { hasError: boolean };

class PlaceholderErrorBoundary extends Component<
  PlaceholderErrorBoundaryProps,
  PlaceholderErrorBoundaryState
> {
  constructor(props: PlaceholderErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): PlaceholderErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}
