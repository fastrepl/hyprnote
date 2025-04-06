import { LanguagesIcon, Maximize2Icon } from "lucide-react";
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
import { WidgetTwoByTwo, WidgetTwoByTwoWrapper } from "@hypr/ui/components/ui/widgets";
import { safeNavigate } from "@hypr/utils";
import { useSessions } from "@hypr/utils/contexts";
import Transcript from "../../components/transcript";
import { useTranscript } from "../../hooks/useTranscript";

const Transcript2x2: WidgetTwoByTwo = ({ onMaximize }) => {
  const sessionId = useSessions((s) => s.currentSessionId);

  return (
    <WidgetTwoByTwoWrapper>
      {sessionId
        ? <Inner sessionId={sessionId} onMaximize={onMaximize} />
        : (
          <div className="p-4 pb-0">
            Session not found
          </div>
        )}
    </WidgetTwoByTwoWrapper>
  );
};

function Inner({ sessionId, onMaximize }: { sessionId: string } & Parameters<WidgetTwoByTwo>["0"]) {
  const { timeline, isLive, selectedLanguage, handleLanguageChange } = useTranscript(sessionId);

  const transcriptRef = useRef<HTMLDivElement>(null);

  const handleOpenTranscriptSettings = () => {
    const extensionId = "@hypr/extension-transcript";
    const url = `/app/settings?current=extensions&extension=${
      encodeURIComponent(
        extensionId,
      )
    }`;

    safeNavigate({ type: "settings" }, url);
  };

  useEffect(() => {
    const scrollToBottom = () => {
      requestAnimationFrame(() => {
        if (transcriptRef.current) {
          transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
      });
    };

    if (isLive && timeline?.items?.length) {
      scrollToBottom();
    }

    if (!isLive && timeline?.items?.length) {
      scrollToBottom();
    }
  }, [timeline?.items, isLive]);

  const maximizeButton = (
    <Button
      key="maximize"
      variant="ghost"
      size="icon"
      onClick={onMaximize}
      className="p-0"
    >
      <Maximize2Icon size={16} className="text-neutral-900" />
    </Button>
  );

  return (
    <WidgetTwoByTwoWrapper>
      {sessionId && (
        <>
          <div className="p-4 pb-0">
            <WidgetHeader
              title={
                <div className="flex items-center gap-2">
                  <button onClick={handleOpenTranscriptSettings}>
                    <img
                      src="/assets/transcript-icon.jpg"
                      className="size-5 rounded-md cursor-pointer"
                      title="Configure Transcript extension"
                    />
                  </button>
                  Transcript
                  {isLive && (
                    <Badge
                      variant="destructive"
                      className="hover:bg-destructive"
                    >
                      LIVE
                    </Badge>
                  )}
                </div>
              }
              actions={[
                <DropdownMenu key="language">
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="p-0">
                      <LanguagesIcon size={16} className="text-black" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuLabel>Select Language</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup
                      value={selectedLanguage}
                      onValueChange={handleLanguageChange}
                    >
                      <DropdownMenuRadioItem value="en">
                        English
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>,
                maximizeButton,
              ]}
            />
          </div>

          {timeline && (
            <Transcript
              ref={transcriptRef}
              transcript={timeline}
              isLive={isLive}
            />
          )}
        </>
      )}
    </WidgetTwoByTwoWrapper>
  );
}

export default Transcript2x2;
