import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import type { TranscriptBlock } from "../../types";
import TranscriptPanel from "./TranscriptPanel";
import ChatPanel from "./ChatPanel";

interface SidePanelProps {
  transcript: string;
  timestamps?: TranscriptBlock[];
}

export default function SidePanel({
  transcript,
  timestamps = [],
}: SidePanelProps) {
  return (
    <div className="flex h-full flex-col border-l border-gray-200 bg-white">
      <PanelGroup direction="vertical">
        <Panel
          defaultSize={30}
          minSize={10}
          maxSize={50}
          className="border-b border-gray-200"
        >
          <TranscriptPanel transcript={transcript} timestamps={timestamps} />
        </Panel>

        <PanelResizeHandle />

        <Panel defaultSize={50} minSize={30}>
          <ChatPanel transcript={transcript} />
        </Panel>
      </PanelGroup>
    </div>
  );
}
