import { AlertCircleIcon, ArrowRightIcon, CheckIcon } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { usePermissions } from "../../hooks/use-permissions";
import { OnboardingContainer, type OnboardingNext } from "./shared";

type PermissionBlockProps = {
  name: string;
  status: string | undefined;
  description: { authorized: string; unauthorized: string };
  isPending: boolean;
  onAction: () => void;
};

function PermissionBlock({
  name,
  status,
  description,
  isPending,
  onAction,
}: PermissionBlockProps) {
  const isAuthorized = status === "authorized";

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-2">
        <div
          className={cn([
            "flex items-center gap-2",
            !isAuthorized ? "text-red-500" : "text-neutral-900",
          ])}
        >
          {!isAuthorized && <AlertCircleIcon className="size-4" />}
          <span className="text-base font-medium">{name}</span>
        </div>
        <p className="text-sm text-neutral-500">
          {isAuthorized ? description.authorized : description.unauthorized}
        </p>
      </div>
      <Button
        variant={isAuthorized ? "outline" : "default"}
        size="icon"
        onClick={onAction}
        disabled={isPending || isAuthorized}
        className={cn([
          "size-8",
          isAuthorized && "bg-stone-100 text-stone-800",
        ])}
        aria-label={
          isAuthorized
            ? `${name} permission granted`
            : `Request ${name.toLowerCase()} permission`
        }
      >
        {isAuthorized ? (
          <CheckIcon className="size-5" />
        ) : (
          <ArrowRightIcon className="size-5" />
        )}
      </Button>
    </div>
  );
}

type PermissionsProps = {
  onNext: OnboardingNext;
};

export function Permissions({ onNext }: PermissionsProps) {
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

  return (
    <OnboardingContainer title="Quick permissions before we begin">
      <div className="flex flex-col gap-4">
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
      </div>

      <Button
        onClick={() => onNext()}
        className="w-full"
        disabled={!allPermissionsGranted}
      >
        {allPermissionsGranted
          ? "Continue"
          : "Need all permissions to continue"}
      </Button>
    </OnboardingContainer>
  );
}
