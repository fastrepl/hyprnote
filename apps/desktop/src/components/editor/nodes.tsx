import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

const Hypercharge = () => {
  return <div>Hypercharging</div>;
};

export const HyperchargeNode = Node.create({
  addNodeView() {
    return ReactNodeViewRenderer(Hypercharge);
  },
});
