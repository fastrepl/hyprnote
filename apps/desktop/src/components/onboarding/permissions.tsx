import { AlertCircleIcon, ArrowRightIcon, CheckIcon } from "lucide-react";

import { cn } from "@hypr/utils";

import { usePermissions } from "../../hooks/usePermissions";
import { Route } from "../../routes/app/onboarding/_layout.index";
import { getBack, getNext, type StepProps } from "./config";
import { OnboardingContainer } from "./shared";

export const STEP_ID_PERMISSIONS = "permissions" as const;

function PermissionBlock({
  name,
  status,
  description,
  isPending,
  onAction,
}: {
  name: string;
  status: string | undefined;
  description: { authorized: string; unauthorized: string };
  isPending: boolean;
  onAction: () => void;
}) {
  const isAuthorized = status === "authorized";

  return (
    <div
      className={cn([
        "flex items-center justify-between rounded-xl py-3 px-4",
        isAuthorized
          ? "border border-border"
          : "border border-destructive/40 bg-destructive/10",
      ])}
    >
      <div className="flex flex-col gap-1">
        <div
          className={cn([
            "flex items-center gap-2",
            !isAuthorized ? "text-destructive" : "text-foreground",
          ])}
        >
          {!isAuthorized && <AlertCircleIcon className="size-4" />}
          <span className="text-sm font-medium">{name}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {isAuthorized ? description.authorized : description.unauthorized}
        </p>
      </div>
      <button
        onClick={onAction}
        disabled={isPending || isAuthorized}
        className={cn([
          "size-8 flex items-center justify-center rounded-lg transition-all",
          isAuthorized
            ? "bg-muted text-foreground opacity-50 cursor-not-allowed"
            : "bg-destructive text-destructive-foreground hover:scale-[1.05] active:scale-[0.95]",
          isPending && "opacity-50 cursor-not-allowed",
        ])}
        aria-label={
          isAuthorized
            ? `${name} permission granted`
            : `Request ${name.toLowerCase()} permission`
        }
      >
        {isAuthorized ? (
          <CheckIcon className="size-4" />
        ) : (
          <ArrowRightIcon className="size-4" />
        )}
      </button>
    </div>
  );
}

export function Permissions({ onNavigate }: StepProps) {
  const search = Route.useSearch();
  const {
    micPermissionStatus,
    systemAudioPermissionStatus,
    accessibilityPermissionStatus,
    micPermission,
    systemAudioPermission,
    accessibilityPermission,
    handleMicPermissionAction,
    handleSystemAudioPermissionAction,
    handleAccessibilityPermissionAction,
  } = usePermissions();

  const allPermissionsGranted =
    micPermissionStatus.data === "authorized" &&
    systemAudioPermissionStatus.data === "authorized" &&
    accessibilityPermissionStatus.data === "authorized";

  const backStep = getBack(search);

  return (
    <OnboardingContainer
      title="Permissions needed for best experience"
      onBack={
        backStep ? () => onNavigate({ ...search, step: backStep }) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        <PermissionBlock
          name="Accessibility"
          status={accessibilityPermissionStatus.data}
          description={{
            authorized: "Good to go :)",
            unauthorized: "To sync mic inputs & mute from meetings",
          }}
          isPending={accessibilityPermission.isPending}
          onAction={handleAccessibilityPermissionAction}
        />

        <PermissionBlock
          name="Microphone"
          status={micPermissionStatus.data}
          description={{
            authorized: "Good to go :)",
            unauthorized: "To capture your voice",
          }}
          isPending={micPermission.isPending}
          onAction={handleMicPermissionAction}
        />

        <PermissionBlock
          name="System audio"
          status={systemAudioPermissionStatus.data}
          description={{
            authorized: "Good to go :)",
            unauthorized: "To capture what other people are saying",
          }}
          isPending={systemAudioPermission.isPending}
          onAction={handleSystemAudioPermissionAction}
        />
      </div>

      <button
        onClick={() => {
          const nextStep = getNext(search);
          if (nextStep) {
            onNavigate({ ...search, step: nextStep });
          }
        }}
        disabled={!allPermissionsGranted}
        className={cn([
          "w-full py-3 rounded-full text-sm font-medium duration-150",
          allPermissionsGranted
            ? "bg-primary text-primary-foreground hover:scale-[1.01] active:scale-[0.99]"
            : "bg-muted text-muted-foreground cursor-not-allowed",
        ])}
      >
        {allPermissionsGranted
          ? "Continue"
          : "Need all permissions to continue"}
      </button>
    </OnboardingContainer>
  );
}
