import { Channel } from "@tauri-apps/api/core";
import { LanguagesIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { commands as listenerCommands, type SessionEvent, type TimelineView } from "@hypr/plugin-listener";
import { Badge } from "@hypr/ui/components/ui/badge";
import { Button } from "@hypr/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";
import { WidgetHeader } from "@hypr/ui/components/ui/widgets";
import { useOngoingSession, useSession } from "@hypr/utils/contexts";
import Transcript from "./transcript";

interface TranscriptWidgetProps {
  sessionId: string;
  headerAction: React.ReactNode;
}

export function TranscriptWidget({
  sessionId,
  headerAction,
}: TranscriptWidgetProps) {
  const ongoingSessionStatus = useOngoingSession((s) => s.status);
  const isEnhanced = useSession(sessionId, (s) => !!s.session.enhanced_memo_html);
  const isLive = useMemo(() => ongoingSessionStatus === "active", [ongoingSessionStatus]);

  const [timeline, setTimeline] = useState<TimelineView | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current && isLive) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [timeline?.items?.length, isLive]);

  useEffect(() => {
    listenerCommands.getTimeline(sessionId, {
      onboarding_override: isEnhanced,
      last_n_seconds: null,
    }).then((timeline) => {
      setTimeline(timeline);
    });
  }, [sessionId, isEnhanced]);

  useEffect(() => {
    const channel = new Channel<SessionEvent>();
    listenerCommands.subscribe(channel);

    channel.onmessage = (e) => {
      if (e.type === "timelineView") {
        setTimeline((prev) => {
          if (!prev) {
            return e.timeline;
          }

          return {
            items: [...prev.items, ...e.timeline.items],
          };
        });
      }
    };

    return () => {
      listenerCommands.unsubscribe(channel);
    };
  }, []);

  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value);
  };

  return (
    <>
      <div className="p-4 pb-0">
        <WidgetHeader
          title={
            <div className="flex items-center gap-2">
              Transcript
              {isLive && <Badge variant="destructive">LIVE</Badge>}
            </div>
          }
          actions={[
            <DropdownMenu key="language">
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="p-0"
                >
                  <LanguagesIcon size={16} className="text-black" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>Select Language</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={selectedLanguage} onValueChange={handleLanguageChange}>
                  <DropdownMenuRadioItem value="en">English</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>,
            headerAction,
          ]}
        />
      </div>

      <div
        ref={scrollRef}
        className="overflow-y-auto flex-1 p-4 pt-0 scrollbar-none"
      >
        <Transcript transcript={timeline} />
      </div>
    </>
  );
}
