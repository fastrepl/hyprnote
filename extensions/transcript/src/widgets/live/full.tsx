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

import { formatTime } from "@hypr/extension-utils";
import {
  commands as listenerCommands,
  type TimelineView,
  type SessionEvent,
} from "@hypr/plugin-listener";

const LiveTranscriptFull: WidgetFullSize = ({ onMinimize }) => {
  const [timeline, setTimeline] = useState<TimelineView | null>(null);
  const [isLive, setIsLive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
  }, []);

  // Auto-scroll when new items are added
  useEffect(() => {
    if (scrollRef.current && isLive) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [timeline?.items.length, isLive]);

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

      <div ref={scrollRef} className="overflow-auto flex-1 p-4 pt-0">
        <Transcript transcript={timeline} />
      </div>
    </WidgetFullSizeWrapper>
  );
};

const Transcript = ({ transcript }: { transcript: TimelineView | null }) => {
  if (!transcript) {
    return null;
  }

  return (
    <div className="flex flex-col space-y-4">
      {transcript.items.map((item, index) => (
        <div
          key={index}
          className="flex flex-col bg-white rounded-lg p-3 shadow-sm border border-neutral-100"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{item.speaker}</span>
            <span className="text-xs text-neutral-500">
              {formatTime(item.start)}~{formatTime(item.end)}
            </span>
          </div>
          <p className="text-sm mt-1">{item.text}</p>
        </div>
      ))}
    </div>
  );
};

export default LiveTranscriptFull;
