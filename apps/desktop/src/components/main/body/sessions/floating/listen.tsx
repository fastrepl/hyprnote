import { Icon } from "@iconify-icon/react";
import { useMediaQuery } from "@uidotdev/usehooks";
import { useCallback } from "react";

import { commands as openerCommands } from "@hypr/plugin-opener2";
import { Spinner } from "@hypr/ui/components/ui/spinner";

import { useListener } from "../../../../../contexts/listener";
import { useEventCountdown } from "../../../../../hooks/useEventCountdown";
import { useStartListening } from "../../../../../hooks/useStartListening";
import * as main from "../../../../../store/tinybase/store/main";
import { type Tab, useTabs } from "../../../../../store/zustand/tabs";
import { RecordingIcon, useListenButtonState } from "../shared";
import { OptionsMenu } from "./options-menu";
import { ActionableTooltipContent, FloatingButton } from "./shared";

export function ListenButton({
  tab,
}: {
  tab: Extract<Tab, { type: "sessions" }>;
}) {
  const { shouldRender } = useListenButtonState(tab.id);
  const { loading, stop } = useListener((state) => ({
    loading: state.live.loading,
    stop: state.stop,
  }));

  if (loading) {
    return (
      <FloatingButton onClick={stop}>
        <Spinner />
      </FloatingButton>
    );
  }

  if (shouldRender) {
    return <BeforeMeeingButton tab={tab} />;
  }

  return null;
}

function BeforeMeeingButton({
  tab,
}: {
  tab: Extract<Tab, { type: "sessions" }>;
}) {
  const remote = useRemoteMeeting(tab.id);

  const { isDisabled, warningMessage } = useListenButtonState(tab.id);
  const startListening = useStartListening(tab.id);

  const handleJoin = useCallback(() => {
    if (remote?.url) {
      void openerCommands.openUrl(remote.url, null);
    }
  }, [remote?.url]);

  if (remote) {
    return (
      <SplitMeetingButtons
        remote={remote}
        disabled={isDisabled}
        warningMessage={warningMessage}
        onJoin={handleJoin}
        onStartListening={startListening}
        sessionId={tab.id}
      />
    );
  }

  return (
    <ListenSplitButton
      content={
        <>
          <RecordingIcon /> <span>Start listening</span>
        </>
      }
      disabled={isDisabled}
      warningMessage={warningMessage}
      onPrimaryClick={startListening}
      sessionId={tab.id}
    />
  );
}

function SplitMeetingButtons({
  remote,
  disabled,
  warningMessage,
  onJoin,
  onStartListening,
  sessionId,
}: {
  remote: RemoteMeeting;
  disabled: boolean;
  warningMessage: string;
  onJoin: () => void;
  onStartListening: () => void;
  sessionId: string;
}) {
  const openNew = useTabs((state) => state.openNew);
  const countdown = useEventCountdown(sessionId);
  const isNarrow = useMediaQuery("(max-width: 870px)");

  const handleConfigure = useCallback(() => {
    onStartListening();
    openNew({ type: "ai", state: { tab: "transcription" } });
  }, [onStartListening, openNew]);

  const getMeetingIcon = () => {
    switch (remote.type) {
      case "zoom":
        return <Icon icon="logos:zoom-icon" width={20} />;
      case "google-meet":
        return <Icon icon="logos:google-meet" width={20} />;
      case "webex":
        return <Icon icon="simple-icons:webex" width={20} />;
      case "teams":
        return <Icon icon="logos:microsoft-teams" width={20} />;
    }
  };

  const getMeetingName = () => {
    switch (remote.type) {
      case "zoom":
        return "Zoom";
      case "google-meet":
        return "Meet";
      case "webex":
        return "Webex";
      case "teams":
        return "Teams";
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      {!isNarrow && (
        <FloatingButton
          onClick={onJoin}
          className="justify-center gap-2 bg-white hover:bg-neutral-100 text-neutral-800 border-neutral-200 shadow-[0_4px_14px_rgba(0,0,0,0.1)]"
        >
          <span>Join</span>
          {getMeetingIcon()}
          <span>{getMeetingName()}</span>
        </FloatingButton>
      )}
      <div className="relative flex items-center">
        <FloatingButton
          onClick={onStartListening}
          disabled={disabled}
          className="justify-center gap-2 pr-12 bg-linear-to-b from-stone-700 to-stone-800 hover:from-stone-600 hover:to-stone-700 text-white border-stone-600 shadow-[0_4px_14px_rgba(87,83,78,0.4)]"
          tooltip={
            warningMessage
              ? {
                  side: "top",
                  content: (
                    <ActionableTooltipContent
                      message={warningMessage}
                      action={{
                        label: "Configure",
                        handleClick: handleConfigure,
                      }}
                    />
                  ),
                }
              : undefined
          }
        >
          <RecordingIcon /> <span>Start listening</span>
        </FloatingButton>
        <OptionsMenu
          sessionId={sessionId}
          disabled={disabled}
          warningMessage={warningMessage}
          onConfigure={handleConfigure}
        />
      </div>
      {countdown && (
        <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 whitespace-nowrap text-xs text-neutral-500">
          {countdown}
        </div>
      )}
    </div>
  );
}

function ListenSplitButton({
  content,
  disabled,
  warningMessage,
  onPrimaryClick,
  sessionId,
}: {
  content: React.ReactNode;
  disabled: boolean;
  warningMessage: string;
  onPrimaryClick: () => void;
  sessionId: string;
}) {
  const openNew = useTabs((state) => state.openNew);
  const countdown = useEventCountdown(sessionId);

  const handleAction = useCallback(() => {
    onPrimaryClick();
    openNew({ type: "ai", state: { tab: "transcription" } });
  }, [onPrimaryClick, openNew]);

  return (
    <div className="relative flex items-center">
      <FloatingButton
        onClick={onPrimaryClick}
        disabled={disabled}
        className="justify-center gap-2 pr-12 bg-linear-to-b from-stone-700 to-stone-800 hover:from-stone-600 hover:to-stone-700 text-white border-stone-600 shadow-[0_4px_14px_rgba(87,83,78,0.4)]"
        tooltip={
          warningMessage
            ? {
                side: "top",
                content: (
                  <ActionableTooltipContent
                    message={warningMessage}
                    action={{
                      label: "Configure",
                      handleClick: handleAction,
                    }}
                  />
                ),
              }
            : undefined
        }
      >
        {content}
      </FloatingButton>
      <OptionsMenu
        sessionId={sessionId}
        disabled={disabled}
        warningMessage={warningMessage}
        onConfigure={handleAction}
      />
      {countdown && (
        <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 whitespace-nowrap text-xs text-neutral-500">
          {countdown}
        </div>
      )}
    </div>
  );
}

type RemoteMeeting = {
  type: "zoom" | "google-meet" | "webex" | "teams";
  url: string;
};

function detectMeetingType(
  url: string,
): "zoom" | "google-meet" | "webex" | "teams" | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    if (hostname.includes("zoom.us")) {
      return "zoom";
    }
    if (hostname.includes("meet.google.com")) {
      return "google-meet";
    }
    if (hostname.includes("webex.com")) {
      return "webex";
    }
    if (hostname.includes("teams.microsoft.com")) {
      return "teams";
    }
    return null;
  } catch {
    return null;
  }
}

function useRemoteMeeting(sessionId: string): RemoteMeeting | null {
  const eventId = main.UI.useCell(
    "sessions",
    sessionId,
    "event_id",
    main.STORE_ID,
  );
  const meetingLink = main.UI.useCell(
    "events",
    eventId ?? "",
    "meeting_link",
    main.STORE_ID,
  );

  if (!meetingLink) {
    return null;
  }

  const type = detectMeetingType(meetingLink);
  if (!type) {
    return null;
  }

  return { type, url: meetingLink };
}
