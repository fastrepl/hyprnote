import { Icon } from "@iconify-icon/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { message } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { ArrowRightIcon, CheckCircle2Icon, CircleQuestionMarkIcon, MicIcon, Volume2Icon } from "lucide-react";
import { useCallback, useState } from "react";
import { z } from "zod";

import { commands as listenerCommands } from "@hypr/plugin-listener";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";
import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { TextAnimate } from "@hypr/ui/components/ui/text-animate";
import { cn } from "@hypr/ui/lib/utils";

const STEPS = ["welcome", "calendars", "permissions"] as const;

const validateSearch = z.object({
  step: z.enum(STEPS).default("welcome"),
  local: z.boolean().default(false),
});

type OnboardingSearch = z.infer<typeof validateSearch>;

export const Route = createFileRoute("/app/onboarding")({
  validateSearch,
  component: Component,
});

function Component() {
  const { step, local } = Route.useSearch();

  let content: React.ReactNode = null;

  if (step === "welcome") {
    content = <Welcome />;
  }

  if (step === "permissions") {
    content = <Permissions />;
  }

  if (step === "calendars") {
    content = <Calendars local={local} />;
  }

  return (
    <div
      data-tauri-drag-region
      className="flex h-full items-center justify-center px-8 py-12"
    >
      {content}
    </div>
  );
}

function Welcome() {
  const { goNext } = useOnboarding();

  return (
    <div className="flex flex-col items-center">
      <img
        src="/assets/logo.svg"
        alt="HYPRNOTE"
        className="mb-6 w-[300px]"
        draggable={false}
      />

      <TextAnimate
        animation="slideUp"
        by="word"
        once
        className="mb-16 text-center text-xl font-medium text-gray-600"
      >
        Where Conversations Stay Yours
      </TextAnimate>

      <PushableButton
        onClick={() => goNext({ local: false })}
        className="mb-4 w-full max-w-sm hover:underline decoration-gray-100"
      >
        Get Started
      </PushableButton>

      <div
        className={cn([
          "flex flex-row gap-1 items-center",
          "text-gray-400 hover:text-gray-800 transition-colors",
        ])}
      >
        <button className="text-sm underline" onClick={() => goNext({ local: true })}>
          Or proceed without an account
        </button>
        <CircleQuestionMarkIcon className="w-4 h-4 cursor-help" />
      </div>
    </div>
  );
}

function Permissions() {
  const { goNext } = useOnboarding();
  const [micPermissionRequested, setMicPermissionRequested] = useState(false);

  const micPermissionStatus = useQuery({
    queryKey: ["micPermission"],
    queryFn: () => listenerCommands.checkMicrophoneAccess(),
    refetchInterval: 1000,
  });

  const systemAudioPermissionStatus = useQuery({
    queryKey: ["systemAudioPermission"],
    queryFn: () => listenerCommands.checkSystemAudioAccess(),
    refetchInterval: 1000,
  });

  const micPermission = useMutation({
    mutationFn: () => listenerCommands.requestMicrophoneAccess(),
    onSuccess: () => {
      setMicPermissionRequested(true);
      setTimeout(() => {
        micPermissionStatus.refetch();
      }, 3000);
    },
    onError: (error) => {
      setMicPermissionRequested(true);
      console.error(error);
    },
  });

  const capturePermission = useMutation({
    mutationFn: () => listenerCommands.requestSystemAudioAccess(),
    onSuccess: () => {
      message("The app will now restart to apply the changes", { kind: "info", title: "System Audio Status Changed" });
      setTimeout(() => {
        relaunch();
      }, 2000);
    },
    onError: console.error,
  });

  const handleMicPermissionAction = () => {
    if (micPermissionRequested && !micPermissionStatus.data) {
      listenerCommands.openMicrophoneAccessSettings();
    } else {
      micPermission.mutate();
    }
  };

  const allPermissionsGranted = micPermissionStatus.data && systemAudioPermissionStatus.data;

  return (
    <OnboardingContainer
      title="Just two quick permissions before we begin"
      description="After you grant system audio access, app will restart to apply the changes"
      action={{ kind: "next", hide: !allPermissionsGranted, onClick: () => goNext() }}
    >
      <div className="flex flex-col gap-4">
        <PermissionRow
          icon={<MicIcon className="h-5 w-5" />}
          title="Microphone access"
          description="Required for meeting transcription"
          done={micPermissionStatus.data}
          isPending={micPermission.isPending}
          onAction={handleMicPermissionAction}
          buttonText={micPermissionRequested && !micPermissionStatus.data ? "Open Settings" : "Enable"}
        />
        <PermissionRow
          icon={<Volume2Icon className="h-5 w-5" />}
          title="System audio access"
          description="Required for meeting transcription"
          done={systemAudioPermissionStatus.data}
          isPending={capturePermission.isPending}
          onAction={() => capturePermission.mutate(undefined)}
          buttonText="Enable"
        />
      </div>

      {allPermissionsGranted && (
        <PushableButton onClick={() => goNext()} className="w-full">
          Continue
        </PushableButton>
      )}

      {!allPermissionsGranted && (
        <p className="text-xs text-muted-foreground text-center">
          Grant both permissions to continue
        </p>
      )}
    </OnboardingContainer>
  );
}

function Calendars({ local }: { local: boolean }) {
  const { goNext } = useOnboarding();
  return (
    <OnboardingContainer
      title="Connect your calendars to be reminded every time"
      action={{ kind: "skip", onClick: () => goNext() }}
    >
      <div className="flex flex-col gap-4">
        {local
          ? (
            <>
              <IntegrationRow
                icon={<Icon icon="logos:google-calendar" width="24" height="24" />}
                name="Google Calendar"
                description="Connect your Google Calendar"
              />
              <IntegrationRow
                icon={<Icon icon="vscode-icons:file-type-outlook" width="24" height="24" />}
                name="Outlook"
                description="Connect your Outlook Calendar"
              />
              <Divider text="Directly connecting Google/Outlook works better" />
              <IntegrationRow
                icon={<Icon icon="logos:apple" width="24" height="24" />}
                name="Apple Calendar"
                description="Connect your Apple Calendar"
              />
            </>
          )
          : (
            <>
              <IntegrationRow
                icon={<Icon icon="logos:apple" width="24" height="24" />}
                name="Apple Calendar"
                description="Connect your Apple Calendar"
              />
              <Divider text="You need account" />
              <IntegrationRow
                icon={<Icon icon="logos:google-calendar" width="24" height="24" />}
                name="Google Calendar"
                description="Connect your Google Calendar"
                disabled
              />
              <IntegrationRow
                icon={<Icon icon="vscode-icons:file-type-outlook" width="24" height="24" />}
                name="Outlook"
                description="Connect your Outlook Calendar"
                disabled
              />
            </>
          )}
      </div>
    </OnboardingContainer>
  );
}

function OnboardingContainer({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: {
    kind: "skip" | "next";
    hide?: boolean;
    onClick: () => void;
  };
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-xl">
      <div className="flex flex-col gap-8">
        <div className="space-y-3 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">{title}</h1>
          {description && <p className="text-base text-gray-500">{description}</p>}
        </div>

        {children}

        {action && !action.hide && (
          <button
            className="self-center text-sm font-medium text-gray-400 transition hover:text-gray-600"
            onClick={action.onClick}
          >
            {action.kind}
          </button>
        )}
      </div>
    </div>
  );
}

function PermissionRow({
  icon,
  title,
  description,
  done,
  isPending,
  onAction,
  buttonText,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  done: boolean | undefined;
  isPending: boolean;
  onAction: () => void;
  buttonText: string;
}) {
  return (
    <div
      className={cn([
        "flex items-center justify-between rounded-2xl border px-6 py-5",
        "transition-all duration-200",
        done ? "border-blue-500 bg-blue-50" : "bg-white border-neutral-200",
      ])}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className={cn([
            "flex size-10 items-center justify-center rounded-full flex-shrink-0",
            done ? "bg-blue-100" : "bg-neutral-50",
          ])}
        >
          <div className={cn(done ? "text-blue-600" : "text-neutral-500")}>{icon}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{title}</div>
          <div className="text-sm text-muted-foreground">
            {done
              ? (
                <span className="text-blue-600 flex items-center gap-1">
                  <CheckCircle2Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  Access Granted
                </span>
              )
              : <span className="block truncate pr-2">{description}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {!done && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAction}
            disabled={isPending}
            className="min-w-20"
          >
            {isPending
              ? (
                <>
                  <Spinner className="mr-2" />
                  Requesting...
                </>
              )
              : <p>{buttonText}</p>}
          </Button>
        )}
        {done && (
          <div className="flex size-8 items-center justify-center rounded-full bg-blue-100">
            <CheckCircle2Icon className="w-4 h-4 text-blue-600" />
          </div>
        )}
      </div>
    </div>
  );
}

function IntegrationRow({
  icon,
  name,
  description,
  onConnect,
  disabled = false,
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
  onConnect?: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn([
        "flex items-center justify-between rounded-2xl border border-gray-100 px-6 py-5",
        disabled && "opacity-50",
      ])}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-lg">
          {icon}
        </span>
        <div className="flex flex-col">
          <span className="text-base font-medium text-gray-900">{name}</span>
          <span className="text-sm text-gray-500">{description}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onConnect}
        disabled={disabled}
        className={cn([
          "flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-white transition hover:bg-gray-700",
          disabled && "cursor-not-allowed hover:bg-gray-900",
        ])}
      >
        <ArrowRightIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function Divider({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-gray-200" />
      <span className="text-sm text-gray-500">{text}</span>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

function useOnboarding() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { step } = search;

  const previous = STEPS?.[STEPS.indexOf(step) - 1] as typeof STEPS[number] | undefined;
  const next = STEPS?.[STEPS.indexOf(step) + 1] as typeof STEPS[number] | undefined;

  const goPrevious = useCallback(() => {
    if (!previous) {
      return;
    }

    navigate({ to: "/app/onboarding", search: { ...search, step: previous } });
  }, [search, navigate]);

  const goNext = useCallback((params?: Partial<Omit<OnboardingSearch, "step">>) => {
    if (!next) {
      windowsCommands.windowShow({ type: "main" }).then(() => {
        windowsCommands.windowDestroy({ type: "onboarding" });
      });
      return;
    }

    navigate({
      to: "/app/onboarding",
      search: { ...search, step: next, ...(params ?? {}) },
    });
  }, [navigate, next, search]);

  return {
    step,
    previous,
    next,
    goNext,
    goPrevious,
  };
}
