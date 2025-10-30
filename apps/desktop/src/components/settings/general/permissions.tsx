import { usePermissions } from "../../../hooks/use-permissions";
import { PermissionRow } from "../../shared/permission-row";

export function Permissions() {
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

  return (
    <div>
      <h2 className="font-semibold mb-4">Permissions</h2>
      <div className="space-y-4">
        <PermissionRow
          title="Microphone access"
          status={micPermissionStatus.data}
          isPending={micPermission.isPending}
          onAction={handleMicPermissionAction}
          variant="compact"
        />
        <PermissionRow
          title="System audio access"
          status={systemAudioPermissionStatus.data}
          isPending={systemAudioPermission.isPending}
          onAction={handleSystemAudioPermissionAction}
          variant="compact"
        />
        <PermissionRow
          title="Accessibility access"
          status={accessibilityPermissionStatus.data}
          isPending={accessibilityPermission.isPending}
          onAction={handleAccessibilityPermissionAction}
          variant="compact"
        />
      </div>
    </div>
  );
}
