import { Icon } from "@iconify-icon/react";
import { useMediaQuery } from "@uidotdev/usehooks";
import { useCallback } from "react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { cn } from "@hypr/utils";
import { useListener } from "../../../../../contexts/listener";
import { useStartListening } from "../../../../../hooks/useStartListening";
import { useSTTConnection } from "../../../../../hooks/useSTTConnection";
import * as main from "../../../../../store/tinybase/main";
import { type Tab } from "../../../../../store/zustand/tabs";
import { ActionableTooltipContent, FloatingButton } from "./shared";

export function ListenButton({ tab }: { tab: Extract<Tab, { type: "sessions" }> }) {
  const { status, loading, stop } = useListener((state) => ({
    status: state.status,
    loading: state.loading,
    start: state.start,
    stop: state.stop,
  }));

  if (loading) {
    return (
      <FloatingButton onClick={stop}>
        <Spinner />
      </FloatingButton>
    );
  }

  if (status === "inactive") {
    return <BeforeMeeingButton tab={tab} />;
  }
}

function BeforeMeeingButton({ tab }: { tab: Extract<Tab, { type: "sessions" }> }) {
  const remote = useRemoteMeeting(tab.id);
  const isNarrow = useMediaQuery("(max-width: 870px)");

  const sttConnection = useSTTConnection();

  const handleClick = useStartListening(tab.id);

  const warnings = [];
  if (!sttConnection) {
    warnings.push("Transcription model not available.");
  }
  const warningMessage = warnings.join(". ");

  const isDisabled = !sttConnection;

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
    icon = (
      <div className="relative size-2">
        <div className="absolute inset-0 rounded-full bg-red-600"></div>
        <div
          className={cn([
            "absolute inset-0 rounded-full bg-red-300",
            !isDisabled && "animate-ping",
          ])}
        >
        </div>
      </div>
    );
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
