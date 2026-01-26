import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";

export function SettingsLab() {
  const handleOpenControlWindow = async () => {
    await windowsCommands.windowShow({ type: "control" });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-medium mb-1">Control Overlay</h3>
          <p className="text-xs text-neutral-600">
            Open a floating control window for quick access to recording
            controls. This window stays on top and can be used during meetings.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleOpenControlWindow}>
          Open
        </Button>
      </div>
    </div>
  );
}
