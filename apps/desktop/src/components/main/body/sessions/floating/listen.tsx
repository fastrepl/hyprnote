import { Icon } from "@iconify-icon/react";
import { useMediaQuery } from "@uidotdev/usehooks";
import { useCallback, useEffect, useState } from "react";

import { commands as openerCommands } from "@hypr/plugin-opener2";
import { Spinner } from "@hypr/ui/components/ui/spinner";

import { useListener } from "../../../../../contexts/listener";
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
  const isNarrow = useMediaQuery("(max-width: 870px)");

  const { isDisabled, warningMessage } = useListenButtonState(tab.id);
  const startListening = useStartListening(tab.id);

  const handleClick = useCallback(() => {
    if (remote?.url) {
      void openerCommands.openUrl(remote.url, null);
    }
    startListening();
  }, [remote?.url, startListening]);

  let content: React.ReactNode;

  if (remote?.type === "zoom") {
    content = isNarrow ? (
      <>
        <span>Join</span> <Icon icon="logos:zoom-icon" size={20} />
      </>
    ) : (
      <>
        <span>Join</span> <Icon icon="logos:zoom-icon" size={20} />{" "}
        <span>Zoom & Start listening</span>
      </>
    );
  } else if (remote?.type === "google-meet") {
    content = isNarrow ? (
      <>
        <span>Join</span> <Icon icon="logos:google-meet" size={20} />
      </>
    ) : (
      <>
        <span>Join</span> <Icon icon="logos:google-meet" size={20} />{" "}
        <span>Google Meet & Start listening</span>
      </>
    );
  } else if (remote?.type === "webex") {
    content = isNarrow ? (
      <>
        <span>Join</span> <Icon icon="simple-icons:webex" size={20} />
      </>
    ) : (
      <>
        <span>Join</span> <Icon icon="simple-icons:webex" size={20} />{" "}
        <span>Webex & Start listening</span>
      </>
    );
  } else if (remote?.type === "teams") {
    content = isNarrow ? (
      <>
        <span>Join</span> <Icon icon="logos:microsoft-teams" size={20} />
      </>
    ) : (
      <>
        <span>Join</span> <Icon icon="logos:microsoft-teams" size={20} />{" "}
        <span>Teams & Start listening</span>
      </>
    );
  } else {
    content = (
      <>
        <RecordingIcon /> <span>Start listening</span>
      </>
    );
  }

  return (
    <ListenSplitButton
      content={content}
      disabled={isDisabled}
      warningMessage={warningMessage}
      onPrimaryClick={handleClick}
      sessionId={tab.id}
    />
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

function useEventCountdown(sessionId: string): string | null {
  const eventId = main.UI.useCell(
    "sessions",
    sessionId,
    "event_id",
    main.STORE_ID,
  );
  const startedAt = main.UI.useCell(
    "events",
    eventId ?? "",
    "started_at",
    main.STORE_ID,
  );

  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!startedAt) {
      setCountdown(null);
      return;
    }

    const eventStart = new Date(startedAt).getTime();

    const updateCountdown = () => {
      const now = Date.now();
      const diff = eventStart - now;
      const fiveMinutes = 5 * 60 * 1000;

      if (diff <= 0 || diff > fiveMinutes) {
        setCountdown(null);
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      if (mins > 0) {
        setCountdown(`meeting starts in ${mins} mins ${secs} seconds`);
      } else {
        setCountdown(`meeting starts in ${secs} seconds`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return countdown;
}

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
