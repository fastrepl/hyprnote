import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { AlertCircleIcon, ArrowRightIcon, CheckIcon } from "lucide-react";

import { usePermissions } from "../../hooks/use-permissions";
import { OnboardingContainer, type OnboardingNext } from "./shared";

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

  const allPermissionsGranted = micPermissionStatus.data === "authorized"
    && systemAudioPermissionStatus.data === "authorized"
    && accessibilityPermissionStatus.data === "authorized";

  return (
    <OnboardingContainer title="Quick permissions before we begin">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="gap-2">
            <div
              className={cn([
                "flex items-center gap-2",
                micPermissionStatus.data !== "authorized" ? "text-red-500" : "text-neutral-900",
              ])}
            >
              {micPermissionStatus.data !== "authorized" && <AlertCircleIcon className="size-4" />}
              <span className="text-base font-medium">Microphone</span>
            </div>
            <p className="text-sm text-neutral-500">
              {micPermissionStatus.data === "authorized" ? "Good to go :)" : "To capture your voice"}
            </p>
          </div>
          <Button
            variant={micPermissionStatus.data === "authorized" ? "outline" : "default"}
            size="icon"
            onClick={handleMicPermissionAction}
            disabled={micPermission.isPending || micPermissionStatus.data === "authorized"}
            className={cn(["size-8", micPermissionStatus.data === "authorized" && "bg-stone-100 text-stone-800"])}
          >
            {micPermissionStatus.data === "authorized"
              ? <CheckIcon className="size-5" />
              : <ArrowRightIcon className="size-5" />}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="gap-2">
            <div
              className={cn([
                "flex items-center gap-2",
                systemAudioPermissionStatus.data !== "authorized" ? "text-red-500" : "text-neutral-900",
              ])}
            >
              {systemAudioPermissionStatus.data !== "authorized" && <AlertCircleIcon className="size-4" />}
              <span className="text-base font-medium">System audio</span>
            </div>
            <p className="text-sm text-neutral-500">
              {systemAudioPermissionStatus.data === "authorized"
                ? "Good to go :)"
                : "To capture what other people are saying"}
            </p>
          </div>
          <Button
            variant={systemAudioPermissionStatus.data === "authorized" ? "outline" : "default"}
            size="icon"
            onClick={handleSystemAudioPermissionAction}
            disabled={systemAudioPermission.isPending || systemAudioPermissionStatus.data === "authorized"}
            className={cn([
              "size-8",
              systemAudioPermissionStatus.data === "authorized" && "bg-stone-100 text-stone-800",
            ])}
          >
            {systemAudioPermissionStatus.data === "authorized"
              ? <CheckIcon className="size-5" />
              : <ArrowRightIcon className="size-5" />}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="gap-2">
            <div
              className={cn([
                "flex items-center gap-2",
                accessibilityPermissionStatus.data !== "authorized" ? "text-red-500" : "text-neutral-900",
              ])}
            >
              {accessibilityPermissionStatus.data !== "authorized" && <AlertCircleIcon className="size-4" />}
              <span className="text-base font-medium">Accessibility</span>
            </div>
            <p className="text-sm text-neutral-500">
              {accessibilityPermissionStatus.data === "authorized"
                ? "Good to go :)"
                : "To sync mic inputs & mute from meetings"}
            </p>
          </div>
          <Button
            variant={accessibilityPermissionStatus.data === "authorized" ? "outline" : "default"}
            size="icon"
            onClick={handleAccessibilityPermissionAction}
            disabled={accessibilityPermission.isPending || accessibilityPermissionStatus.data === "authorized"}
            className={cn([
              "size-8",
              accessibilityPermissionStatus.data === "authorized" && "bg-stone-100 text-stone-800",
            ])}
          >
            {accessibilityPermissionStatus.data === "authorized"
              ? <CheckIcon className="size-5" />
              : <ArrowRightIcon className="size-5" />}
          </Button>
        </div>
      </div>

      <Button onClick={() => onNext()} className="w-full" disabled={!allPermissionsGranted}>
        {allPermissionsGranted ? "Continue" : "Need all permissions to continue"}
      </Button>
    </OnboardingContainer>
  );
}
