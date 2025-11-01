import { Icon } from "@iconify-icon/react";
import { useMediaQuery } from "@uidotdev/usehooks";
import { useCallback } from "react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { useListener } from "../../../../../contexts/listener";
import { useStartListening } from "../../../../../hooks/useStartListening";
import * as main from "../../../../../store/tinybase/main";
import { type Tab } from "../../../../../store/zustand/tabs";
import { RecordingIcon, useListenButtonState } from "../shared";
import { ActionableTooltipContent, FloatingButton } from "./shared";

export function ListenButton({ tab }: { tab: Extract<Tab, { type: "sessions" }> }) {
  const { shouldRender } = useListenButtonState(tab.id);
  const { loading, stop } = useListener((state) => ({
    loading: state.loading,
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

function BeforeMeeingButton({ tab }: { tab: Extract<Tab, { type: "sessions" }> }) {
  const remote = useRemoteMeeting(tab.id);
  const isNarrow = useMediaQuery("(max-width: 870px)");

  const { isDisabled, warningMessage } = useListenButtonState(tab.id);
  const handleClick = useStartListening(tab.id);

  let icon: React.ReactNode;
  let text: string;

  if (remote?.type === "zoom") {
    icon = <Icon icon="logos:zoom-icon" size={20} />;
    text = isNarrow ? "Join & Listen" : "Join Zoom & Start listening";
  } else if (remote?.type === "google-meet") {
    icon = <Icon icon="logos:google-meet" size={20} />;
    text = isNarrow ? "Join & Listen" : "Join Google Meet & Start listening";
  } else if (remote?.type === "webex") {
    icon = <Icon icon="simple-icons:webex" size={20} />;
    text = isNarrow ? "Join & Listen" : "Join Webex & Start listening";
  } else if (remote?.type === "teams") {
    icon = <Icon icon="logos:microsoft-teams" size={20} />;
    text = isNarrow ? "Join & Listen" : "Join Teams & Start listening";
  } else {
    icon = <RecordingIcon disabled={isDisabled} />;
    text = "Start listening";
  }

  return (
    <StartButton
      icon={icon}
      text={text}
      disabled={isDisabled}
      warningMessage={warningMessage}
      onClick={handleClick}
    />
  );
}

function StartButton({
  icon,
  text,
  disabled,
  warningMessage,
  onClick,
}: {
  icon: React.ReactNode;
  text: string;
  disabled: boolean;
  warningMessage: string;
  onClick: () => void;
}) {
  const handleAction = useCallback(() => {
    onClick();
    windowsCommands.windowShow({ type: "settings" })
      .then(() => new Promise((resolve) => setTimeout(resolve, 1000)))
      .then(() =>
        windowsCommands.windowEmitNavigate({ type: "settings" }, {
          path: "/app/settings",
          search: { tab: "transcription" },
        })
      );
  }, [onClick]);

  return (
    <FloatingButton
      onClick={onClick}
      icon={icon}
      disabled={disabled}
      tooltip={warningMessage
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
        : undefined}
    >
      {text}
    </FloatingButton>
  );
}

type RemoteMeeting = { type: "zoom" | "google-meet" | "webex" | "teams"; url: string | null };

function useRemoteMeeting(sessionId: string): RemoteMeeting | null {
  const eventId = main.UI.useRemoteRowId(main.RELATIONSHIPS.sessionToEvent, sessionId);
  const note = main.UI.useCell("events", eventId ?? "", "note", main.STORE_ID);

  if (!note) {
    return null;
  }

  const remote = {
    type: "google-meet",
    url: null,
  } as RemoteMeeting | null;

  return remote;
}
