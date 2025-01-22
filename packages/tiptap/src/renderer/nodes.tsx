import { mergeAttributes, Node, NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";

import clsx from "clsx";
import { RiFlashlightFill } from "@remixicon/react";

const Hypercharge = ({ HTMLAttributes }: NodeViewProps) => {
  const text = HTMLAttributes.text;

  return (
    <NodeViewWrapper>
      <div
        className={clsx([
          "flex flex-row items-center gap-3 rounded-xl bg-primary/10 px-2 py-0.5",
          "shadow-md shadow-slate-300/50",
        ])}
      >
        <div
          className={clsx([
            "flex h-4 w-4 items-center justify-center rounded-full",
            "bg-primary-300 shadow-primary-300/50 animate-pulse shadow-lg",
            "ring-2 ring-primary/20 ring-offset-0 ring-offset-slate-100",
          ])}
        >
          <RiFlashlightFill className="text-primary/50" />
        </div>
        <p className="text-sm text-foreground">{text}</p>
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
