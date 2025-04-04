import { LanguagesIcon, Minimize2Icon } from "lucide-react";
import { useEffect, useRef } from "react";

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
import { WidgetFullSize, WidgetFullSizeWrapper } from "@hypr/ui/components/ui/widgets";
import { useSessions } from "@hypr/utils/contexts";
import Transcript from "../../components/transcript";
import { useTranscript } from "../../hooks/useTranscript";

const TranscriptFull: WidgetFullSize = ({ onMinimize }) => {
  const sessionId = useSessions((s) => s.currentSessionId);
  const { timeline, isLive, selectedLanguage, handleLanguageChange } = useTranscript(sessionId);

  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollToBottom = () => {
      requestAnimationFrame(() => {
        if (transcriptRef.current) {
          transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
      });
    };

    // Always scroll for new items when live
    if (isLive && timeline?.items?.length) {
      scrollToBottom();
    }

    // Also scroll on initial load
    if (!isLive && timeline?.items?.length) {
      scrollToBottom();
    }
  }, [timeline?.items, isLive]);

  const minimizeButton = (
    <Button
      key="minimize"
      variant="ghost"
      size="icon"
      onClick={onMinimize}
    >
      <Minimize2Icon className="h-4 w-4 text-black" />
    </Button>
  );

  return (
    <WidgetFullSizeWrapper onMinimize={onMinimize}>
      {sessionId && (
        <>
          <div className="p-4 pb-0">
            <WidgetHeader
              title={
                <div className="flex items-center gap-2">
                  Transcript
                  {isLive && <Badge variant="destructive" className="hover:bg-destructive">LIVE</Badge>}
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
                minimizeButton,
              ]}
            />
          </div>

          <Transcript ref={transcriptRef} transcript={timeline} isLive={isLive} />
        </>
      )}
    </WidgetFullSizeWrapper>
  );
};

export default TranscriptFull;
