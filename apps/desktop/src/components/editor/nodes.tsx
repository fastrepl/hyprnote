import { mergeAttributes, Node, NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";

import clsx from "clsx";
import { RiFlashlightLine } from "@remixicon/react";

const Hypercharge = ({ HTMLAttributes }: NodeViewProps) => {
  const text = HTMLAttributes.text;

  return (
    <NodeViewWrapper>
      <div
        className={clsx([
          "flex flex-row items-center gap-3 rounded-xl bg-slate-100 px-3 py-2",
          "shadow-lg shadow-slate-300/50",
        ])}
      >
        <div
          className={clsx([
            "flex h-6 w-6 items-center justify-center rounded-full",
            "animate-pulse bg-yellow-300 shadow-lg shadow-yellow-300/50",
          ])}
        >
          <RiFlashlightLine className="text-yellow-600" />
        </div>
        <p className="text-md text-slate-600">{text}</p>
      </div>
    </NodeViewWrapper>
  );
};

export const HyprchargeNode = Node.create({
  name: "hyprcharge",
  group: "block",
  addAttributes() {
    return {
      text: {
        default: "warning: use 'text' attribute to set the text.",
      },
    };
  },
  parseHTML() {
    return [{ tag: "hyprcharge" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["hyprcharge", mergeAttributes(HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(Hypercharge);
  },
});
