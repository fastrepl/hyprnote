import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { useHypr } from "@/contexts";
import { useEnhancePendingState } from "@/hooks/enhance-pending";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as listenerCommands } from "@hypr/plugin-listener";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { ListenButton as ListenButtonInner, type ListenButtonState } from "@hypr/ui/components/block/listen-button";
import { sonnerToast, toast } from "@hypr/ui/components/ui/toast";
import { useOngoingSession, useSession } from "@hypr/utils/contexts";

export default function ListenButton({ sessionId, isCompact = false }: { sessionId: string; isCompact?: boolean }) {
  const { onboardingSessionId, userId } = useHypr();
  const isEnhancePending = useEnhancePendingState(sessionId);

  const amplitude = useOngoingSession((s) => s.amplitude);
  const muted = useOngoingSession((s) => ({ mic: s.micMuted, speaker: s.speakerMuted }));
  const ongoingSessionStatus = useOngoingSession((s) => s.status);
  const ongoingSessionId = useOngoingSession((s) => s.sessionId);
  const ongoingSessionStore = useOngoingSession((s) => ({
    start: s.start,
    stop: s.stop,
    loading: s.loading,
  }));

  const sessionWords = useSession(sessionId, (s) => s.session.words);
  const nonEmptySession = useSession(
    sessionId,
    (s) => !!(s.session.words.length > 0 || s.session.enhanced_memo_html),
  );

  const isOnboarding = sessionId === onboardingSessionId;
  const meetingEnded = isEnhancePending || nonEmptySession;

  const modelDownloaded = useQuery({
    queryKey: ["check-stt-model-downloaded"],
    refetchInterval: 1500,
    enabled: ongoingSessionStatus !== "running_active",
    queryFn: async () => {
      const currentModel = await localSttCommands.getLocalModel();
      const isDownloaded = await localSttCommands.isModelDownloaded(currentModel);
      const servers = await localSttCommands.getServers();
      const isServerAvailable = (servers.external === "ready") || (servers.internal === "ready")
        || (servers.custom === "ready");
      return isDownloaded && isServerAvailable;
    },
  });

  const disabled = !modelDownloaded || (meetingEnded && isEnhancePending);

  const state: ListenButtonState = (() => {
    if (ongoingSessionStore.loading) {
      return "loading";
    }

    if (ongoingSessionStatus === "inactive") {
      return meetingEnded ? "inactive_meeting_ended" : "inactive_meeting_not_ended";
    }

    // ongoingSessionStatus === "running_active"
    return sessionId === ongoingSessionId
      ? "running_active_this_session"
      : "running_active_other_session";
  })();

  // TODO: 1. this show toast again when re-entering the session
  // TODO:  2. this is not ideal place to do this
  // don't show consent notification if the session already has transcript
  useEffect(() => {
    if (
      ongoingSessionStatus === "running_active" && sessionId === ongoingSessionId && !isOnboarding
      && sessionWords.length === 0
    ) {
      showConsentNotification();
    }
  }, [ongoingSessionStatus, sessionId, ongoingSessionId, isOnboarding, sessionWords.length]);

  const handleStartSession = () => {
    if (ongoingSessionStatus === "inactive") {
      ongoingSessionStore.start(sessionId);

      if (isOnboarding) {
        listenerCommands.setMicMuted(true);
      }

      if (!isOnboarding && userId) {
        analyticsCommands.event({
          event: "recording_start_session",
          distinct_id: userId,
          properties: { session_id: sessionId },
        });
      }
    }
  };

  const handleStopSession = () => {
    ongoingSessionStore.stop();

    if (sessionWords.length === 0) {
      sonnerToast.dismiss("recording-consent-reminder");
    }

    if (userId) {
      analyticsCommands.event({
        event: "recording_stop_session",
        distinct_id: userId,
        properties: { session_id: sessionId },
      });
    }
  };

  const toggleMicMuted = useMutation({
    mutationFn: async () => {
      const result = await listenerCommands.setMicMuted(!muted.mic);
      return result;
    },
    onMutate: () => {
      if (!muted.mic && userId) {
        analyticsCommands.event({
          event: "recording_mute_mic",
          distinct_id: userId,
        });
      }
    },
  });

  const toggleSpeakerMuted = useMutation({
    mutationFn: async () => {
      const result = await listenerCommands.setSpeakerMuted(!muted.speaker);
      return result;
    },
    onMutate: () => {
      if (!muted.speaker && userId) {
        analyticsCommands.event({
          event: "recording_mute_system",
          distinct_id: userId,
        });
      }
    },
  });

  const allDevicesQuery = useQuery({
    queryKey: ["microphone", "devices"],
    queryFn: () => listenerCommands.listMicrophoneDevices(),
  });

  const currentDeviceQuery = useQuery({
    queryKey: ["microphone", "current-device"],
    queryFn: () => listenerCommands.getCurrentMicrophoneDevice(),
    retry: 5,
    retryDelay: 500,
  });

  const handleSelectDevice = (device: string) => {
    listenerCommands.setMicrophoneDevice(device).then(() => {
      currentDeviceQuery.refetch();

      if (userId) {
        analyticsCommands.event({
          event: "recording_select_mic_trigger",
          distinct_id: userId,
        });
      }
    });
  };

  const handleOpenMicSelectorPopover = () => {
    analyticsCommands.event({
      event: "recording_select_mic_option",
      distinct_id: userId,
    });
  };

  return (
    <ListenButtonInner
      state={state}
      disabled={disabled}
      isOnboarding={isOnboarding}
      isCompact={isCompact}
      handleStartSession={handleStartSession}
      handleStopSession={handleStopSession}
      muted={muted}
      amplitude={amplitude}
      setMicMuted={toggleMicMuted.mutate}
      setSpeakerMuted={toggleSpeakerMuted.mutate}
      currentDevice={currentDeviceQuery.data ?? undefined}
      availableDevices={allDevicesQuery.data}
      handleSelectDevice={handleSelectDevice}
      handleOpenMicSelectorPopover={handleOpenMicSelectorPopover}
    />
  );
}

const showConsentNotification = () => {
  toast({
    id: "recording-consent-reminder",
    title: "🔴 Recording Started",
    content: "Don't forget to notify others that you're recording this session for transparency and consent.",
    buttons: [
      {
        label: "I've notified everyone",
        onClick: () => {
          sonnerToast.dismiss("recording-consent-reminder");
        },
        primary: true,
      },
    ],
    dismissible: false,
  });
};
