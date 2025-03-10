import { useEffect, useState, useRef } from "react";
import { Maximize2Icon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Channel } from "@tauri-apps/api/core";

import { Button } from "@hypr/ui/components/ui/button";
import {
  WidgetHeader,
  type WidgetTwoByTwo,
  WidgetTwoByTwoWrapper,
} from "@hypr/ui/components/ui/widgets";
import { Badge } from "@hypr/ui/components/ui/badge";
import {
  commands as listenerCommands,
  type TimelineView,
  type SessionEvent,
} from "@hypr/plugin-listener";

import Translation from "../components/translation";

const LiveTranslation2x2: WidgetTwoByTwo = ({ onMaximize }) => {
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

  // Auto-scroll when new items are added
  useEffect(() => {
    if (scrollRef.current && isLive) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [timeline?.items.length, isLive]);

  const translation = useQuery({
    queryKey: ["translation"],
    queryFn: async () => {
      const response = await fetch("/api/timeline");
      if (!response.ok) {
        throw new Error("Failed to fetch translation");
      }
      return response.json();
    },
  });

  return (
    <WidgetTwoByTwoWrapper>
      <div className="p-4 pb-0">
        <WidgetHeader
          title={
            <div className="flex items-center gap-2">
              Translation
              {isLive && <Badge variant="destructive">LIVE</Badge>}
            </div>
          }
          actions={[
            <Button
              key="maximize"
              variant="ghost"
              size="icon"
              onClick={onMaximize}
              className="p-0"
            >
              <Maximize2Icon size={16} className="text-black dark:text-white" />
            </Button>,
          ]}
        />
      </div>

      <div
        ref={scrollRef}
        className="overflow-y-auto flex-1 p-4 pt-0 scrollbar-none"
      >
        <Translation translation={timeline || translation.data} />
      </div>
    </WidgetTwoByTwoWrapper>
  );
};

export default LiveTranslation2x2;
