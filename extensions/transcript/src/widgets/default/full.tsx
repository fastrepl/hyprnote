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
import Transcript from "../components/transcript";

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

    return () => {
      listenerCommands.unsubscribe(channel);
    };
  }, []);

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
              <Minimize2Icon className="h-4 w-4 text-black " />
            </Button>,
          ]}
        />
      </div>

      <div
        ref={scrollRef}
        className="overflow-auto flex-1 p-4 pt-0 scrollbar-none"
      >
        <Transcript transcript={timeline} />
      </div>
    </WidgetFullSizeWrapper>
  );
};

export default LiveTranscriptFull;
