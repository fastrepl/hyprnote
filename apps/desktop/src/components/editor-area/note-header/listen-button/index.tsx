import { useQuery } from "@tanstack/react-query";
import usePreviousValue from "beautiful-react-hooks/usePreviousValue";
import { useEffect } from "react";

import { useEnhancePendingState } from "@/hooks/enhance-pending";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { toast } from "@hypr/ui/components/ui/toast";
import { useOngoingSession, useSession } from "@hypr/utils/contexts";

import { ActiveRecordButton, EndedButton, InitialRecordButton, LoadingButton, ResumeButton } from "./buttons";

interface ListenButtonProps {
  sessionId: string;
}

export default function ListenButton({ sessionId }: ListenButtonProps) {
  const modelDownloaded = useQuery({
    queryKey: ["check-stt-model-downloaded"],
    refetchInterval: 1000,
    queryFn: async () => {
      const currentModel = await localSttCommands.getCurrentModel();
      const isDownloaded = await localSttCommands.isModelDownloaded(
        currentModel,
      );
      return isDownloaded;
    },
  });

  const ongoingSessionStatus = useOngoingSession((s) => s.status);
  const prevOngoingSessionStatus = usePreviousValue(ongoingSessionStatus);

  const ongoingSessionStore = useOngoingSession((s) => ({
    start: s.start,
    resume: s.resume,
    pause: s.pause,
    stop: s.stop,
    isCurrent: s.sessionId === sessionId,
    loading: s.loading,
    sessionId: s.sessionId,
  }));

  const isEnhancePending = useEnhancePendingState(sessionId);
  const nonEmptySession = useSession(
    sessionId,
    (s) => s.session.conversations.length > 0 || s.session.enhanced_memo_html,
  );
  const meetingEnded = isEnhancePending || nonEmptySession;

  useEffect(() => {
    if (
      ongoingSessionStatus === "running_active"
      && prevOngoingSessionStatus === "inactive"
    ) {
      toast({
        id: "recording-consent",
        title: "Recording Started",
        content: "Ensure you have consent from everyone in the meeting",
        dismissible: true,
        duration: 3000,
      });
    }
  }, [ongoingSessionStatus]);

  const handleStartSession = () => {
    if (ongoingSessionStatus === "inactive") {
      ongoingSessionStore.start(sessionId);
    }
  };

  const handleResumeSession = () => {
    ongoingSessionStore.resume();
  };

  const handlePauseSession = () => {
    ongoingSessionStore.pause();
  };

  const handleStopSession = () => {
    ongoingSessionStore.stop();
  };

  if (ongoingSessionStore.loading) {
    return <LoadingButton />;
  }

  if (
    ongoingSessionStatus === "running_paused"
    && ongoingSessionStore.isCurrent
  ) {
    return (
      <ResumeButton
        disabled={!modelDownloaded.data}
        onClick={handleResumeSession}
      />
    );
  }

  if (ongoingSessionStatus === "inactive") {
    if (!meetingEnded) {
      return (
        <InitialRecordButton
          disabled={!modelDownloaded.data}
          onClick={handleStartSession}
        />
      );
    } else {
      return (
        <EndedButton
          disabled={!modelDownloaded.data || isEnhancePending}
          onClick={handleStartSession}
        />
      );
    }
  }

  if (ongoingSessionStatus === "running_active") {
    if (!ongoingSessionStore.isCurrent) {
      return null;
    }

    return (
      <ActiveRecordButton
        onClick={handleStartSession}
        onPause={handlePauseSession}
        onStop={handleStopSession}
      />
    );
  }
}
