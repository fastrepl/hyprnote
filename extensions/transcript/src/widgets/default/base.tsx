import React from "react";

import { commands as miscCommands } from "@hypr/plugin-misc";
import { safeNavigate } from "@hypr/utils";
import { useOngoingSession, useSessions } from "@hypr/utils/contexts";

import { Active, Inactive } from "../../components";
import { useTranscript } from "../../hooks/useTranscript";
import { useTranscriptWidget } from "../../hooks/useTranscriptWidget";

export interface TranscriptBaseProps {
  onSizeToggle?: () => void;
  sizeToggleButton: React.ReactNode;
  WrapperComponent: React.ComponentType<any>;
  wrapperProps?: Record<string, any>;
}

export const TranscriptBase: React.FC<TranscriptBaseProps> = ({
  sizeToggleButton,
  WrapperComponent,
  wrapperProps = {},
}) => {
  const sessionId = useSessions((s) => s.currentSessionId);
  const isInactive = useOngoingSession((s) => s.status === "inactive");
  const { showEmptyMessage, isEnhanced, hasTranscript } = useTranscriptWidget(sessionId);
  const { timeline, isLive, isLoading } = useTranscript(sessionId);

  const handleOpenTranscriptSettings = () => {
    const extensionId = "@hypr/extension-transcript";
    const url = `/app/settings?tab=extensions&extension=${extensionId}`;

    safeNavigate({ type: "settings" }, url);
  };

  const handleOpenSession = () => {
    if (sessionId) {
      miscCommands.openAudio(sessionId);
    }
  };

  if (!sessionId || (sessionId && showEmptyMessage)) {
    return (
      <WrapperComponent
        {...wrapperProps}
        className="relative w-full h-full"
      >
        <Inactive
          sessionId={sessionId}
          showEmptyMessage={!!showEmptyMessage}
          isEnhanced={!!isEnhanced}
        />
      </WrapperComponent>
    );
  }

  return (
    <Active
      sessionId={sessionId}
      hasTranscript={!!hasTranscript}
      isInactive={!!isInactive}
      sizeToggleButton={sizeToggleButton}
      WrapperComponent={WrapperComponent}
      wrapperProps={wrapperProps}
      onOpenTranscriptSettings={handleOpenTranscriptSettings}
      onOpenSession={handleOpenSession}
      transcriptProps={{
        timeline: timeline || { items: [] },
        isLive: !!isLive,
        isLoading: !!isLoading,
      }}
      isLive={!!isLive}
    />
  );
};
