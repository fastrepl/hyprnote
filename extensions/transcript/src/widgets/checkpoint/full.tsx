import { useEffect, useState, useRef } from "react";
import { Channel } from "@tauri-apps/api/core";
import { Minimize2Icon } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";
import {
  WidgetFullSize,
  WidgetFullSizeWrapper,
  WidgetHeader,
} from "@hypr/ui/components/ui/widgets";
import { Badge } from "@hypr/ui/components/ui/badge";

import {
  commands as listenerCommands,
  type TimelineView,
  type SessionEvent,
} from "@hypr/plugin-listener";
import TranscriptWithCheckpoints from "../components/transcript-with-checkpoints";
import AddCheckpointButton from "../components/add-checkpoint-button";
import { formatTime } from "../../utils";

const LiveTranscriptWithCheckpointFull: WidgetFullSize = ({ onMinimize }) => {
  const [timeline, setTimeline] = useState<TimelineView | null>(null);
  const [isLive, setIsLive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [checkpoints, setCheckpoints] = useState<string[]>([]);

  useEffect(() => {
    const channel = new Channel<SessionEvent>();
    listenerCommands.subscribe(channel);

    channel.onmessage = (e) => {
      if (e.type === "timelineView") {
        setIsLive(true);
        setTimeline((prev) => {
          if (!prev) return e.timeline;
          return {
            items: [...prev.items, ...e.timeline.items],
          };
        });
      }

      if (e.type === "stopped") {
        setIsLive(false);
      }
    };

    return () => {
      listenerCommands.unsubscribe(channel);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current && isLive) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [timeline?.items.length, isLive]);

  const handleAddCheckpoint = () => {
    if (!timeline || timeline.items.length === 0) return;

    const latestItem = [...timeline.items].sort((a, b) => b.end - a.end)[0];
    const timestamp = formatTime(latestItem.end);

    setCheckpoints((prev) => {
      if (prev.includes(timestamp)) return prev;
      return [...prev, timestamp];
    });
  };

  const hasTranscriptItems = timeline && timeline.items.length > 0;

  return (
    <WidgetFullSizeWrapper onMinimize={onMinimize}>
      <div className="p-4 pb-0">
        <WidgetHeader
          title={
            <div className="flex items-center gap-2">
              Transcript
              {isLive && <Badge variant="destructive">LIVE</Badge>}
            </div>
          }
          actions={[
            <Button
              key="minimize"
              variant="ghost"
              size="icon"
              onClick={onMinimize}
            >
              <Minimize2Icon className="h-4 w-4" />
            </Button>,
          ]}
        />
      </div>

      <div className="flex-1 p-4 pt-0 flex flex-col overflow-hidden">
        <div
          ref={scrollRef}
          className="overflow-y-auto flex-1 scrollbar-none pb-4"
        >
          <TranscriptWithCheckpoints
            transcript={timeline}
            checkpoints={checkpoints}
          />
        </div>

        <AddCheckpointButton
          onClick={handleAddCheckpoint}
          disabled={!hasTranscriptItems || !isLive}
        />
      </div>
    </WidgetFullSizeWrapper>
  );
};

export default LiveTranscriptWithCheckpointFull;
