import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";

export const SpeakerView = ({ node, updateAttributes }: any) => {
  const names = node.attrs.speakers || [];

  const label = node.attrs.label && names.includes(node.attrs.label)
    ? node.attrs.label
    : names[0] || "";

  const handleChange = (newLabel: string) => {
    if (names.includes(newLabel)) {
      updateAttributes({ label: newLabel });
    }
  };

  return (
    <NodeViewWrapper className="transcript-speaker">
      <div style={{ width: "140px", padding: "8px" }}>
        <Select value={label} onValueChange={handleChange}>
          <SelectTrigger className="transcript-speaker-select" data-speaker-label={label}>
            <SelectValue placeholder="Select speaker" />
          </SelectTrigger>
          <SelectContent>
            {names.map((name: string) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div style={{ padding: "8px" }}>
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  );
};
