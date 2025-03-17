import { commands as dbCommands } from "@hypr/plugin-db";
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
import { WidgetFullSize, WidgetFullSizeWrapper, WidgetHeader } from "@hypr/ui/components/ui/widgets";
import { Channel } from "@tauri-apps/api/core";
import { LanguagesIcon, Minimize2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatTime } from "../../utils";
import AddCheckpointButton from "../components/add-checkpoint-button";
import TranscriptWithCheckpoints from "../components/transcript-with-checkpoints";

const LiveTranscriptWithCheckpointFull: WidgetFullSize = ({ onMinimize }) => {
  const [timeline, setTimeline] = useState<TimelineView | null>(null);
  const [isLive, setIsLive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [checkpoints, setCheckpoints] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  useEffect(() => {
    const fetchDefaultLanguage = async () => {
      try {
        const config = await dbCommands.getConfig();
        if (config && config.general && config.general.display_language) {
          setSelectedLanguage(config.general.display_language);
        }
      } catch (error) {
        console.error("Failed to fetch default language:", error);
      }
    };

    fetchDefaultLanguage();
  }, []);

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

  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value);
    // Here you would implement the actual language change functionality
    // For example, calling an API to translate the transcript
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
            <DropdownMenu key="language">
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                >
                  <LanguagesIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>Select Language</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={selectedLanguage} onValueChange={handleLanguageChange}>
                  <DropdownMenuRadioItem value="en">English</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="zh">Chinese</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="fr">French</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="de">German</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="es">Spanish</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="pt">Portuguese</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="it">Italian</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="nl">Dutch</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="ru">Russian</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="ja">Japanese</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="ko">Korean</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="tr">Turkish</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="hi">Hindi</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="ta">Tamil</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>,
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
