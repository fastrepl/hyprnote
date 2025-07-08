import { useMutation, useQuery } from "@tanstack/react-query";
import { BellIcon, BrainIcon, CalendarIcon, CheckCircle, MicIcon, Volume2Icon } from "lucide-react";

import { commands as appleCalendarCommands } from "@hypr/plugin-apple-calendar";
import { commands as listenerCommands } from "@hypr/plugin-listener";
import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { commands as notificationCommands } from "@hypr/plugin-notification";
import { Button } from "@hypr/ui/components/ui/button";
import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { cn } from "@hypr/ui/lib/utils";
import { Trans } from "@lingui/react/macro";

interface PermissionItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  isRequired: boolean;
  isGranted: boolean | undefined;
  isPending: boolean;
  onRequest: () => void;
}

function PermissionItem({
  icon,
  title,
  description,
  isRequired,
  isGranted,
  isPending,
  onRequest,
}: PermissionItemProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md border p-2.5 transition-colors",
        isGranted ? "bg-neutral-50 border-neutral-200" : "bg-neutral-50",
      )}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="flex size-4 items-center justify-center">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            {title}
            {isRequired && (
              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px]">Required</span>
            )}
          </div>
          {!isGranted && (
            <div className="text-xs text-muted-foreground">
              {description}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-2">
        {isGranted ? <CheckCircle className="h-4 w-4 text-neutral-600" /> : (
          <Button
            variant="outline"
            size="sm"
            onClick={onRequest}
            disabled={isPending}
            className="h-7 px-3 text-xs"
          >
            {isPending
              ? <Spinner className="h-3 w-3" />
              : <Trans>Enable</Trans>}
          </Button>
        )}
      </div>
    </div>
  );
}

interface PermissionsValidationViewProps {
  onComplete: () => void;
  onSkipToApp: () => void;
}

export function PermissionsValidationView({ onComplete, onSkipToApp }: PermissionsValidationViewProps) {
  // Combined permission status query for better performance
  const permissionsStatus = useQuery({
    queryKey: ["setupValidator", "permissions"],
    queryFn: async () => {
      const [mic, systemAudio, calendar, notification, sttModel, llmModel] = await Promise.all([
        listenerCommands.checkMicrophoneAccess(),
        listenerCommands.checkSystemAudioAccess(),
        appleCalendarCommands.calendarAccessStatus(),
        notificationCommands.checkNotificationPermission(),
        localSttCommands.getCurrentModel().then(model => model ? localSttCommands.isModelDownloaded(model) : false)
          .catch(() => false),
        localLlmCommands.isModelDownloaded().catch(() => false),
      ]);

      return {
        microphone: mic,
        systemAudio,
        calendar,
        notification,
        modelsInstalled: sttModel && llmModel,
      };
    },
    refetchInterval: 2000, // Recheck every 2 seconds during setup
  });

  // Permission request mutations
  const micPermission = useMutation({
    mutationFn: () => listenerCommands.requestMicrophoneAccess(),
    onSuccess: () => permissionsStatus.refetch(),
    onError: console.error,
  });

  const systemAudioPermission = useMutation({
    mutationFn: () => listenerCommands.requestSystemAudioAccess(),
    onSuccess: () => permissionsStatus.refetch(),
    onError: console.error,
  });

  const calendarPermission = useMutation({
    mutationFn: () => appleCalendarCommands.requestCalendarAccess(),
    onSuccess: () => permissionsStatus.refetch(),
    onError: console.error,
  });

  const notificationPermission = useMutation({
    mutationFn: () => notificationCommands.requestNotificationPermission(),
    onSuccess: () => permissionsStatus.refetch(),
    onError: console.error,
  });

  // Check if required permissions are granted
  const requiredPermissionsGranted = permissionsStatus.data?.microphone === true
    && permissionsStatus.data?.systemAudio === true
    && permissionsStatus.data?.modelsInstalled === true;

  const permissions = [
    {
      icon: <BrainIcon className="h-4 w-4" />,
      title: "AI Models",
      description: "Required AI models for transcription and processing",
      isRequired: true,
      isGranted: permissionsStatus.data?.modelsInstalled,
      isPending: false,
      onRequest: () => {}, // Models are installed during onboarding, no action needed
    },
    {
      icon: <MicIcon className="h-4 w-4" />,
      title: "Microphone Access",
      description: "Required to transcribe your voice during meetings",
      isRequired: true,
      isGranted: permissionsStatus.data?.microphone,
      isPending: micPermission.isPending,
      onRequest: () => micPermission.mutate({}),
    },
    {
      icon: <Volume2Icon className="h-4 w-4" />,
      title: "System Audio Access",
      description: "Required to transcribe other people's voice during meetings",
      isRequired: true,
      isGranted: permissionsStatus.data?.systemAudio,
      isPending: systemAudioPermission.isPending,
      onRequest: () => systemAudioPermission.mutate({}),
    },
    {
      icon: <CalendarIcon className="h-4 w-4" />,
      title: "Calendar Access",
      description: "Allows automatic meeting detection and event integration",
      isRequired: false,
      isGranted: permissionsStatus.data?.calendar,
      isPending: calendarPermission.isPending,
      onRequest: () => calendarPermission.mutate({}),
    },
    {
      icon: <BellIcon className="h-4 w-4" />,
      title: "Notification Access",
      description: "Shows alerts for meeting detection and important updates",
      isRequired: false,
      isGranted: permissionsStatus.data?.notification === "Granted",
      isPending: notificationPermission.isPending,
      onRequest: () => notificationPermission.mutate({}),
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center p-6">
      <div className="text-center mb-5">
        <MicIcon className="h-6 w-6 mx-auto mb-3 text-neutral-600" />
        <h2 className="text-xl font-semibold mb-2">
          <Trans>Let's test your setup!</Trans>
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mb-2">
          <Trans>Hyprnote listens to your meetings so you don't have to take notes.</Trans>
        </p>
        <div className="inline-flex items-center bg-green-50 border border-green-200 rounded-full px-3 py-1 text-xs text-green-700">
          <Trans>Your audio never leaves your device</Trans>
        </div>
      </div>

      <div className="w-full max-w-md space-y-2 mb-5">
        {permissions.map((permission, index) => (
          <PermissionItem
            key={index}
            {...permission}
          />
        ))}
      </div>

      <div className="flex gap-3">
        <Button
          variant="ghost"
          onClick={onSkipToApp}
          className="px-4 py-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
        >
          <Trans>Skip for Now</Trans>
        </Button>

        <PushableButton
          onClick={onComplete}
          disabled={!requiredPermissionsGranted}
          className="px-6 py-2 bg-black text-white hover:bg-neutral-800 transition-colors rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trans>All Set! Let's Go</Trans>
        </PushableButton>
      </div>
    </div>
  );
}
