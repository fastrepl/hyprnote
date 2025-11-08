import { EyeIcon, MicIcon, Volume2Icon } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";

import { usePermissions } from "../../hooks/use-permissions";
import { PermissionRow } from "../shared/permission-row";
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
    <OnboardingContainer
      title="Just three quick permissions before we begin"
      description="After you grant system audio access, app will restart to apply the changes"
    >
      <div className="flex flex-col gap-4">
        <PermissionRow
          icon={<MicIcon className="h-5 w-5" />}
          title="Microphone"
          description={micPermissionStatus.data === "authorized" ? "Good to go :)" : "Used to capture your voice"}
          status={micPermissionStatus.data}
          isPending={micPermission.isPending}
          onAction={handleMicPermissionAction}
        />
        <PermissionRow
          icon={<Volume2Icon className="h-5 w-5" />}
          title="System audio"
          description={systemAudioPermissionStatus.data === "authorized"
            ? "Good to go :)"
            : "Used to capture what other people are saying"}
          status={systemAudioPermissionStatus.data}
          isPending={systemAudioPermission.isPending}
          onAction={handleSystemAudioPermissionAction}
        />
        <PermissionRow
          icon={<EyeIcon className="h-5 w-5" />}
          title="Accessibility"
          description={accessibilityPermissionStatus.data === "authorized"
            ? "Good to go :)"
            : "Used to sync mic inputs & mute from calls"}
          status={accessibilityPermissionStatus.data}
          isPending={accessibilityPermission.isPending}
          onAction={handleAccessibilityPermissionAction}
        />
      </div>

      <Button onClick={() => onNext()} className="w-full">
        Continue
      </Button>

      {!allPermissionsGranted && (
        <p className="text-center text-xs text-muted-foreground">
          You can grant permissions later in settings
        </p>
      )}
    </OnboardingContainer>
  );
}
